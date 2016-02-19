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
        f.wordDefinitions.push(new Header(latest(), name, immediate, hidden, f.wordDefinitions.length + 1));
        latest(f.wordDefinitions.length - 1);
    };

    f.defjs = function defjs(name, fn, immediate, displayName) {
        defheader(displayName || name, immediate);
        f.wordDefinitions.push(fn);
        return fn;
    };

    f.defvar = function defvar(name, initial) {
        defheader(name);
        var varAddress = f.wordDefinitions.length + 1;
        f.wordDefinitions.push(function variable() {
            f.stack.push(varAddress);
        });
        f.wordDefinitions.push(initial);

        return function(value) {
            if (value !== undefined)
                f.wordDefinitions[varAddress] = value;
            else
                return f.wordDefinitions[varAddress];
        };
    };

    latest = f.defvar("latest", f.wordDefinitions.length); // Replace existing function definition
    f.compiling = f.defvar("state", 0);

    f.compileEnter = function compileEnter(name) {
        var instruction = f.wordDefinitions.length + 1;

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

        f.wordDefinitions.push(enter);
        return enter;
    };

    f.findDefinition = function findDefinition(word) {
        var current = latest();
        while (current !== null) {
            var wordDefinition = f.wordDefinitions[current];
            // Case insensitive
            if (wordDefinition.name.toLowerCase() == word.toLowerCase() && !wordDefinition.hidden)
                return wordDefinition;
            current = wordDefinition.link;
        }
        return current;
    };

    f.defjs(":", function colon() {
        var name = f.readWord();
        defheader(name, false, true);
        f.compileEnter(name);
        f.compiling(true);
    });

    f.defjs(":noname", function noname() {
        defheader("", false, true);
        f.stack.push(f.wordDefinitions.length);
        f.compileEnter("_noname_");
        f.compiling(true);
    });

    var exit = f.defjs("exit", function exit() {
        f.instructionPointer = f.returnStack.pop();
    });

    f.defjs(";", function semicolon() {
        f.wordDefinitions.push(exit);
        f.wordDefinitions[latest()].hidden = false;
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
        defheader(f.readWord());
        var dataFieldAddress = f.wordDefinitions.length + 1;
        f.wordDefinitions.push(function pushDataFieldAddress() {
            f.stack.push(dataFieldAddress);
        });
    });

    f.defjs("allot", function allot() {
        f.wordDefinitions.length += f.stack.pop();
    });

    f.defjs(",", function comma() {
        f.wordDefinitions.push(f.stack.pop());
    });

    f.defjs("compile,", function compileComma() {
        f.wordDefinitions.push(f.wordDefinitions[f.stack.pop()]);
    });

    f.defjs("[", function lbrac() {
        f.compiling(false); // Immediate
    }, true); // Immediate

    f.defjs("]", function rbrac() {
        f.compiling(true); // Compile
    });

    f.defjs("immediate", function immediate() {
        var wordDefinition = f.wordDefinitions[latest()];
        wordDefinition.immediate = !wordDefinition.immediate;
    }, true); // Immediate

    f.defjs("hidden", function hidden() {
        var wordDefinition = f.wordDefinitions[f.stack.pop()];
        wordDefinition.hidden = !wordDefinition.hidden;
    });

    f.defjs("'", function tick() {
        f.stack.push(f.findDefinition(f.readWord()).executionToken);
    });

    f.defjs("[']", function bracketTick() {
        f.wordDefinitions.push(f._lit);
        f.wordDefinitions.push(f.findDefinition(f.readWord()).executionToken);
    }, true);

    f._latest = latest
    return f;
}

module.exports = Definitions;