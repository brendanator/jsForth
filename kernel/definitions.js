function Header(link, name, immediate, hidden, executionToken) {
    this.link = link;
    this.name = name;
    this.immediate = immediate || false;
    this.hidden = hidden || false;
    this.executionToken = executionToken;
}

function Definitions(f) {

    // Temporary definition until latest is defined as a variable
    function latest() {
        return null;
    };

    function defheader(name, immediate, hidden) {
        f.dataSpace.push(new Header(latest(), name, immediate, hidden, f.dataSpace.length + 1));
        latest(f.dataSpace.length - 1);
    };

    f.defjs = function defjs(name, fn, immediate, displayName) {
        defheader(displayName || name, immediate);
        f.dataSpace.push(fn);
        return fn;
    };

    f.defvar = function defvar(name, initial) {
        defheader(name);
        var varAddress = f.dataSpace.length + 1;
        f.dataSpace.push(function variable() {
            f.stack.push(varAddress);
        });
        f.dataSpace.push(initial);

        return function(value) {
            if (value !== undefined)
                f.dataSpace[varAddress] = value;
            else
                return f.dataSpace[varAddress];
        };
    };

    latest = f.defvar("latest", f.dataSpace.length); // Replace existing function definition
    f.compiling = f.defvar("state", 0);

    f.compileEnter = function compileEnter(name) {
        var instruction = f.dataSpace.length + 1;

        var enter;
        try {
            enter = eval(`(
                function ${name}() {
                    f.returnStack.push(f.instructionPointer);
                    f.instructionPointer = instruction;
                })
            `);
        } catch (e) {
            // Failback for names that are invalid identifiers
            enter = function enter() {
                f.returnStack.push(f.instructionPointer);
                f.instructionPointer = instruction;
            };
        }

        f.dataSpace.push(enter);
        return enter;
    };

    f.findDefinition = function findDefinition(word) {
        var current = latest();
        while (current !== null) {
            var wordDefinition = f.dataSpace[current];
            // Case insensitive
            if (wordDefinition.name.toLowerCase() == word.toLowerCase() && !wordDefinition.hidden)
                return wordDefinition;
            current = wordDefinition.link;
        }
        return current;
    };

    f.defjs(":", function colon() {
        var name = f._readWord();
        defheader(name, false, true);
        f.compileEnter(name);
        f.compiling(true);
    });

    f.defjs(":noname", function noname() {
        defheader("", false, true);
        f.stack.push(f.dataSpace.length);
        f.compileEnter("_noname_");
        f.compiling(true);
    });

    var exit = f.defjs("exit", function exit() {
        f.instructionPointer = f.returnStack.pop();
    });

    f.defjs(";", function semicolon() {
        f.dataSpace.push(exit);
        f.dataSpace[latest()].hidden = false;
        f.compiling(false);
    }, true); // Immediate

    f.defjs("find", function find() {
        var word = f.stack.pop();
        if (typeof word === "number") {
            var startPosition = word;
            var length = f._getAddress(startPosition);
            word = "";
            for (var i = 1; i <= length; i++) {
                word += String.fromCharCode(f._getAddress(startPosition + i));
            }
        }
        var definition = f.findDefinition(word);
        if (definition) {
            f.stack.push(definition.executionToken);
            f.stack.push(definition.immediate ? 1 : -1);
        } else {
            f.stack.push(word);
            f.stack.push(0);
        }
    });

    // Converts an execution token into the data field address
    f.defjs(">body", function dataFieldAddress() {
        f.stack.push(f.stack.pop() + 1);
    });

    f.defjs("create", function create() {
        defheader(f._readWord());
        var dataFieldAddress = f.dataSpace.length + 1;
        f.dataSpace.push(function pushDataFieldAddress() {
            f.stack.push(dataFieldAddress);
        });
    });

    f.defjs("allot", function allot() {
        f.dataSpace.length += f.stack.pop();
    });

    f.defjs(",", function comma() {
        f.dataSpace.push(f.stack.pop());
    });

    f.defjs("compile,", function compileComma() {
        f.dataSpace.push(f.dataSpace[f.stack.pop()]);
    });

    f.defjs("[", function lbrac() {
        f.compiling(false); // Immediate
    }, true); // Immediate

    f.defjs("]", function rbrac() {
        f.compiling(true); // Compile
    });

    f.defjs("immediate", function immediate() {
        var wordDefinition = f.dataSpace[latest()];
        wordDefinition.immediate = !wordDefinition.immediate;
    }, true); // Immediate

    f.defjs("hidden", function hidden() {
        var wordDefinition = f.dataSpace[f.stack.pop()];
        wordDefinition.hidden = !wordDefinition.hidden;
    });

    f.defjs("'", function tick() {
        f.stack.push(f.findDefinition(f._readWord()).executionToken);
    });

    var _lit = f.defjs("lit", function lit() {
        f.stack.push(f.dataSpace[f.instructionPointer]);
        f.instructionPointer++;
    });

    f.defjs("[']", function bracketTick() {
        f.dataSpace.push(f._lit);
        f.dataSpace.push(f.findDefinition(f._readWord()).executionToken);
    }, true);

    f._latest = latest
    f._lit = _lit;
    return f;
}

module.exports = Definitions;