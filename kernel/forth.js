var Stack = require("./stack.js");
var Input = require("./input.js");

var Forth = (function(f) {
    f.instructionPointer = 0;
    f.wordDefinitions = [];
    f.returnStack = new Stack("Return Stack");
    f.stack = new Stack("Stack");

    return f;
}({}));

Forth = (function ForthInterals(f) {
    var currentInput;

    f._latest = (function() {
        var val = null;
        return function(value) {
            if (value !== undefined)
                val = value;
            else
                return val;
        };
    })();

    function Header(link, name, immediate, hidden, executionToken) {
        this.link = link;
        this.name = name;
        this.immediate = immediate || false;
        this.hidden = hidden || false;
        this.executionToken = executionToken;
    }

    function defheader(name, immediate, hidden) {
        f.wordDefinitions.push(new Header(f._latest(), name, immediate, hidden, f.wordDefinitions.length + 1));
        f._latest(f.wordDefinitions.length - 1);
    }

    function defjs(name, fn, immediate, displayName) {
        defheader(displayName || name, immediate);
        f.wordDefinitions.push(fn);
        return fn;
    }

    function compileEnter(name) {
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
    }

    var exit = defjs("exit", function exit() {
        f.instructionPointer = f.returnStack.pop();
    });

    function findDefinition(word) {
        var current = f._latest();
        while (current !== null) {
            var wordDefinition = f.wordDefinitions[current];
            // Case insensitive
            if (wordDefinition.name.toLowerCase() == word.toLowerCase() && !wordDefinition.hidden)
                return wordDefinition;
            current = wordDefinition.link;
        }
        return current;
    }
    defjs("find", function find() {
        var word = f.stack.pop();
        if (typeof word === "number") {
            var startPosition = word;
            var length = getAddress(startPosition);
            word = "";
            for (var i = 1; i <= length; i++) {
                word += String.fromCharCode(getAddress(startPosition + i));
            }
        }
        var definition = findDefinition(word);
        if (definition) {
            f.stack.push(definition.executionToken);
            f.stack.push(definition.immediate ? 1 : -1);
        } else {
            f.stack.push(word);
            f.stack.push(0);
        }
    });

    function defvar(name, initial) {
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
    }

    var compiling = defvar("state", 0);
    f._latest = defvar("latest", f.wordDefinitions.length); // Replace existing function definition
    var base = defvar("base", 10);
    var toIn = defvar(">in", 0);

    defjs("here", function here() {
        f.stack.push(f.wordDefinitions.length);
    });

    var _lit = defjs("lit", function lit() {
        f.stack.push(f.wordDefinitions[f.instructionPointer]);
        f.instructionPointer++;
    });

    var SOURCE = 1 << 31; // Address offset to indicate input addresses 

    defjs("source", function source() {
        var positionLength = currentInput.source();
        f.stack.push(SOURCE + positionLength[0]);
        f.stack.push(positionLength[1]);
    });

    defjs("refill", function refill() {
        f.stack.push(currentInput.refill());
    });

    defjs("key", function key() {
        f.stack.push(currentInput.readKey().charCodeAt(0));
    });

    defjs("parse", function parse() {
        var addressLength = currentInput.parse(f.stack.pop());
        f.stack.push(SOURCE + addressLength[0]);
        f.stack.push(addressLength[1]);
    });

    var wordBufferStart = f.wordDefinitions.length;
    f.wordDefinitions.length += 32;
    defjs("word", function word() {
        var delimiter = f.stack.pop();
        if (typeof delimiter === "number") delimiter = String.fromCharCode(delimiter);
        f.stack.push(wordBufferStart);

        var word = currentInput.readWord(delimiter);
        var length = Math.min(word.length, 31);
        f.wordDefinitions[wordBufferStart] = length;
        for (var i = 0; i < length; i++) {
            f.wordDefinitions[wordBufferStart + i + 1] = word.charCodeAt(i);
        }
    });

    defjs("char", function char() {
        f.stack.push(currentInput.readWord().charCodeAt(0));
    });

    defjs("accept", function accept() {
        var savedInput = currentInput;
        var savedToIn = toIn();

        var maxLength = f.stack.pop();
        var address = f.stack.pop();

        f.currentInstruction = function acceptCallback() {
            var received = currentInput.inputBuffer();
            var lengthReceived = Math.min(maxLength, received.length);
            f.stack.push(1);
            setAddress(address, received.split("\n")[0]);

            currentInput = savedInput;
            toIn(savedToIn);
        };

        throw Input.EndOfInput;
    });

    var output = "";

    defjs("cr", function cr() {
        output += "\n";
    });

    defjs(".", function dot() {
        var value;
        var top = f.stack.pop();

        if (typeof top === "undefined")
            value = "undefined";
        else if (top === null)
            value = "null";
        else
            value = top.toString(base()); // Output numbers in current base

        output += value + " ";
    });

    defjs("emit", function emit() {
        var value = f.stack.pop();
        if (typeof value === "number")
            output += String.fromCharCode(value);
        else
            output += value;
    });

    defjs("type", function type() {
        var length = f.stack.pop();
        var address = f.stack.pop();
        for (var i = 0; i < length; i++) {
            var value = getAddress(address + i);
            if (typeof value === "number") {
                output += String.fromCharCode(value);
            } else
                output += value;
        }
    });

    function _parseInt(string, base) {
        var int = 0;
        if (string[0] !== "-") { // Positive
            for (var i = 0; i < string.length; i++) {
                int *= base;
                int += parseInt(string[i], base);
            }
            return int;
        } else {
            for (var j = 1; j < string.length; j++) {
                int *= base;
                int -= parseInt(string[j], base);
            }
            return int;
        }
    }

    // Parse a float in the provide base
    function parseFloat(string, base) {
        //split the string at the decimal point
        string = string.split(/\./);

        //if there is nothing before the decimal point, make it 0
        if (string[0] === '') {
            string[0] = "0";
        }

        //if there was a decimal point & something after it
        if (string.length > 1 && string[1] !== '') {
            var fractionLength = string[1].length;
            string[1] = _parseInt(string[1], base);
            string[1] *= Math.pow(base, -fractionLength);
            var int = _parseInt(string[0], base);
            if (int >= 0)
                return int + string[1];
            else
                return int - string[1];
        }

        //if there wasn't a decimal point or there was but nothing was after it
        return _parseInt(string[0], base);
    }

    function interpretWord() {
        var word = currentInput.readWord();
        var definition = findDefinition(word);
        if (definition) {
            if (!compiling() || definition.immediate) {
                f.wordDefinitions[definition.executionToken]();
                return;
            } else {
                f.wordDefinitions.push(f.wordDefinitions[definition.executionToken]);
            }
        } else {
            var num = parseFloat(word, base());
            if (isNaN(num)) throw "Word not defined: " + word;
            if (compiling()) {
                f.wordDefinitions.push(_lit);
                f.wordDefinitions.push(num);
            } else {
                f.stack.push(num);
            }
        }
    }

    // Converts an execution token into the data field address
    defjs(">body", function dataFieldAddress() {
        f.stack.push(f.stack.pop() + 1);
    });

    defjs("create", function create() {
        defheader(currentInput.readWord());
        var dataFieldAddress = f.wordDefinitions.length + 1;
        f.wordDefinitions.push(function pushDataFieldAddress() {
            f.stack.push(dataFieldAddress);
        });
    });

    defjs("allot", function allot() {
        f.wordDefinitions.length += f.stack.pop();
    });

    defjs(",", function comma() {
        f.wordDefinitions.push(f.stack.pop());
    });

    defjs("compile,", function compileComma() {
        f.wordDefinitions.push(f.wordDefinitions[f.stack.pop()]);
    });

    defjs("[", function lbrac() {
        compiling(false); // Immediate
    }, true); // Immediate

    defjs("]", function rbrac() {
        compiling(true); // Compile
    });

    defjs("immediate", function immediate() {
        var wordDefinition = f.wordDefinitions[f._latest()];
        wordDefinition.immediate = !wordDefinition.immediate;
    }, true); // Immediate

    defjs("hidden", function hidden() {
        var wordDefinition = f.wordDefinitions[f.stack.pop()];
        wordDefinition.hidden = !wordDefinition.hidden;
    });

    function getAddress(address) {
        if (address < 0) {
            return currentInput.charCodeAt(address - SOURCE);
        } else {
            return f.wordDefinitions[address];
        }
    }

    function setAddress(address, value) {
        if (address < 0) {
            // TODO ?
            console.log(input.substring(inputBufferPosition, inputBufferPosition+ 100));
            throw "Changing SOURCE";
        } else {
            f.wordDefinitions[address] = value;
        }
    }

    defjs("!", function store() {
        var address = f.stack.pop();
        var data = f.stack.pop();
        setAddress(address, data);
    });

    defjs("@", function fetch() {
        var address = f.stack.pop();
        f.stack.push(getAddress(address));
    });

    defjs("+!", function addStore() {
        var address = f.stack.pop();
        var data = f.stack.pop();
        f.wordDefinitions[address] = f.wordDefinitions[address] + data;
    });

    defjs("-!", function subtractStore() {
        var address = f.stack.pop();
        var data = f.stack.pop();
        f.wordDefinitions[address] = f.wordDefinitions[address] - data;
    });

    defjs("'", function tick() {
        f.stack.push(findDefinition(currentInput.readWord()).executionToken);
    });

    defjs("[']", function bracketTick() {
        f.wordDefinitions.push(_lit);
        f.wordDefinitions.push(findDefinition(currentInput.readWord()).executionToken);
    }, true);

    defjs("jump", function jump() {
        f.instructionPointer += f.wordDefinitions[f.instructionPointer];
    });

    defjs("jumpIfFalse", function jumpIfFalse() {
        if (!f.stack.pop()) {
            f.instructionPointer += f.wordDefinitions[f.instructionPointer];
        } else {
            f.instructionPointer++; // Skip the offset
        }
    });

    defjs("execute", function execute() {
        f.wordDefinitions[f.stack.pop()]();
    });

    defjs("negate", function negate() {
        f.stack.push(-f.stack.pop());
    });

    defjs("1+", function inc() {
        f.stack.push(f.stack.pop() + 1);
    });

    defjs("1-", function dec() {
        f.stack.push(f.stack.pop() - 1);
    });

    defjs("2*", function inc() {
        f.stack.push(f.stack.pop() << 1);
    });

    defjs("2/", function inc() {
        f.stack.push(f.stack.pop() >> 1);
    });

    defjs("+", function plus() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() + first);
    });

    defjs("-", function minus() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() - first);
    });

    defjs("*", function multiply() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() * first);
    });

    defjs("/", function divide() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() / first);
    });

    defjs("mod", function mod() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() % first);
    });

    defjs("abs", function abs() {
        f.stack.push(Math.abs(f.stack.pop()));
    });

    defjs("lshift", function lshift() {
        var shift = f.stack.pop();
        var num = f.stack.pop();
        f.stack.push(num << shift);
    });

    defjs("rshift", function rshift() {
        var shift = f.stack.pop();
        var num = f.stack.pop();
        f.stack.push(num >>> shift);
    });

    defjs("max", function max() {
        f.stack.push(Math.max(f.stack.pop(), f.stack.pop()));
    });

    defjs("min", function min() {
        f.stack.push(Math.min(f.stack.pop(), f.stack.pop()));
    });


    defjs("unsigned", function unsigned() {
        f.stack.push(f.stack.pop() >>> 0);
    });

    defjs("true", function _true() {
        f.stack.push(true);
    });

    defjs("false", function _false() {
        f.stack.push(false);
    });

    defjs("and", function and() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() & first);
    });

    defjs("or", function or() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() | first);
    });

    defjs("xor", function xor() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() ^ first);
    });

    defjs("invert", function invert() {
        f.stack.push(~f.stack.pop());
    });


    // Interop
    //   - new with params          js .new{1}
    //   - global variable access   js /document
    //   - array access             js .0.2
    //   - property access/setting  js .name  js .name!
    //   - function calling         js .sin{1} .{2}  >>  obj = pop, f = obj[name], f.call(obj, pop(), pop())
    //   - method calling           js /document.getElementById{1}
    //
    // When compiling it should resolve global names immediately.
    function jsNewCall(path) {
        var constructor = f.stack.pop();
        var argsCount = parseInt(path.match(/\{(\d*)\}/)[1] || 0);
        var args = [null]; // new replaces the first argument with this
        for (var j = 0; j < argsCount; j++) {
            args.push(f.stack.pop());
        }
        // Use new operator with any number of arguments
        return new(Function.prototype.bind.apply(constructor, args))();
    }

    function jsFunctionCall(path) {
        var argsCount = parseInt(path.match(/\{(\d*)\}/)[1] || 0);
        var obj = f.stack.pop();
        path = path.match(/[^\{]*/)[0];
        var func = path ? obj[path] : obj;
        var args = [];
        for (var j = 0; j < argsCount; j++) {
            args.push(f.stack.pop());
        }
        return func.apply(obj, args);
    }

    var jsAssignmentRegex = /(^[A-Za-z$_][\w$_]*!$)|(^\d+!$)/; // name!
    var jsNewCallRegex = /new\{\d*\}$/; // new{2}
    var jsFunctionCallRegex = /((^[A-Za-z$_][\w$_]*)|(^\d+))?\{\d*\}$/; // getElementById{1}

    var globl = (typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document) ? window : global;

    function jsInterop(js) {
        if (js.startsWith("/")) { // Add global to f.stack
            f.stack.push(globl);
        } else if (!js.startsWith(".")) {
            throw "js interop call must start with '/' or '.'";
        }

        var paths = js.length > 1 ? js.substring(1).split(".") : [];

        for (var i = 0; i < paths.length; i++) {
            var path = paths[i];

            if (path.match(jsAssignmentRegex)) {
                f.stack.pop()[path.substring(0, path.length - 1)] = f.stack.pop();
            } else if (path.match(jsNewCallRegex)) {
                f.stack.push(jsNewCall(path));
            } else if (path.match(jsFunctionCallRegex)) {
                f.stack.push(jsFunctionCall(path));
            } else { // Property access
                f.stack.push(f.stack.pop()[path]);
            }
        }
    }

    var JS = defjs("js", function js() {
        jsInterop(f.stack.pop());
    });

    defjs("js", function js() {
        if (compiling()) {
            f.wordDefinitions.push(_lit);
            f.wordDefinitions.push(currentInput.readWord());
            f.wordDefinitions.push(JS);
        } else {
            jsInterop(currentInput.readWord());
        }
    }, true);

    defjs("clearReturnStack", function clearReturnStack() {
        f.returnStack.clear();
    });

    defjs(":", function colon() {
        var name = currentInput.readWord();
        defheader(name, false, true);
        compileEnter(name);
        compiling(true);
    });

    defjs(":noname", function noname() {
        defheader("", false, true);
        f.stack.push(f.wordDefinitions.length);
        compileEnter("_noname_");
        compiling(true);
    });

    defjs(";", function semicolon() {
        f.wordDefinitions.push(exit);
        f.wordDefinitions[f._latest()].hidden = false;
        compiling(false);
    }, true); // Immediate

    var _does = defjs("_does", function _does() {
        var wordPosition = f._latest();
        var doDoesPosition = f.instructionPointer;

        f.wordDefinitions[wordPosition + 1] = function doDoes() {
            f.stack.push(wordPosition + 2);
            f.returnStack.push(f.instructionPointer);
            f.instructionPointer = doDoesPosition;
        };

        f.instructionPointer = f.returnStack.pop();
    });

    defjs("does>", function does() {
        f.wordDefinitions.push(_does);
    }, true); // Immediate


    function defword(name, words, immediate, displayName) {
        defheader(name, immediate);
        var enter = compileEnter(displayName || name);
        f.wordDefinitions = f.wordDefinitions.concat(
            words.map(function(word) {
                if (typeof word !== "string") {
                    return word;
                } else {
                    return f.wordDefinitions[findDefinition(word).executionToken];
                }
            })
        );
        return enter;
    }

    var interpret = defword("interpret", [
        interpretWord, // Interpret the next word ..
        "jump", -2 // .. and loop forever
    ], "semicolon");

    var quit = defword("quit", [
        "[", // Enter interpretation state
        "clearReturnStack", // Clear the return f.stack
        "interpret" // Run the intepreter
    ]);

    function abort(error) {
        f.stack.clear();
        throw error || "";
    }
    defjs("abort", abort);

    defjs('abort"', function abortQuote() {
        var error = currentInput.parse('"')[2];
        f.wordDefinitions.push(function abortQuote() {
            if (f.stack.pop())
                abort(error);
        });
    }, true); // Immediate

    defjs("evaluate", function evaluate() {
        var savedInput = currentInput;
        var savedToIn = toIn();

        var length = f.stack.pop();
        var position = f.stack.pop() - SOURCE;
        currentInput = currentInput.subInput(position, length);

        var savedInstructionPointer = f.instructionPointer;

        var evaluateInstruction = interpret;

        try {
            // As js doesn't support tail call optimisation the
            // run function uses a trampoline to execute forth code
            while (true) {
                evaluateInstruction();
                evaluateInstruction = f.wordDefinitions[f.instructionPointer++];
            }
        } catch (err) {
            if (err == Input.EndOfInput) {
                currentInput = savedInput;
                toIn(savedToIn);
                f.instructionPointer = savedInstructionPointer;
                // Pop interpret from returnStack
                f.returnStack.pop();
            } else {
                throw err;
            }
        }
    });

    var inputString = ""
    function run(input) {
        output = "";
        startPosition = inputString.length;
        inputString += input;
        currentInput = Input(inputString, startPosition, inputString.length, toIn);

        try {
            // As js doesn't support tail call optimisation the
            // run function uses a trampoline to execute forth code
            while (true) {
                f.currentInstruction();
                f.currentInstruction = f.wordDefinitions[f.instructionPointer++];
            }
        } catch (err) {
            if (err !== Input.EndOfInput) {
                console.log(output);
                console.log("Exception " + err + " at:\n" + printStackTrace());
                console.log(currentInput.inputBuffer());
                f.currentInstruction = quit;
                f.stack.clear();
                throw err;
            }
        }
        return output;
    }

    function printStackTrace() {
        var stackTrace = "    " + f.currentInstruction.name + " @ " + (f.instructionPointer - 1);
        for (var i = f.returnStack.length - 1; i >= 0; i--) {
            var instruction = f.returnStack[i];
            stackTrace += "\n    " + f.wordDefinitions[instruction - 1].name + " @ " + (instruction - 1);
        }
        return stackTrace;
    }

    f.defjs = defjs;
    f.run = run;
    f.currentInstruction = quit;
    f._lit = _lit;
    return f;
}(Forth));

require("./comparison-operations.js")(Forth);
require("./control-structures.js")(Forth);
require("./stack-operations.js")(Forth);

module.exports = Forth;