(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
function Repl() {
    "use strict";

    var forth = require("./kernel/forth.js");

    function loadForth(file) {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                console.log(forth.run(xmlhttp.responseText));
                showStack();
            }
        };
        xmlhttp.open("GET", file, true);
        xmlhttp.send();
    }
    loadForth("forth/forth.fth");
    // loadForth("forth/ans-forth-tests.fth");

    var inputHistory = [""];
    var historyCount = 0;
    var historySelection = 0;

    function useHistory(selection) {
        var inputNode = document.getElementById("input");

        if (inputNode.value !== inputHistory[historySelection]) {
            historySelection = historyCount - 1;
            inputHistory[historyCount] = inputNode.value;
        } else {
            historySelection = Math.min(Math.max(selection, 0), inputHistory.length - 1);
        }

        inputNode.value = inputHistory[historySelection];
        inputNode.selectionStart = inputNode.value.length;
    }

    function updateHistory(input) {
        // Remove duplicates
        for (var i = inputHistory.length - 1; i >= 0; i--) {
            if (inputHistory[i] === input) {
                inputHistory.splice(i, 1);
                historyCount--;
            }
        }
        inputHistory[historyCount] = input;
        historyCount = inputHistory.length;
        historySelection = inputHistory.length;
        inputHistory.push("");
    }

    function createOutputNode(icon, text, className) {
        var outputNode = document.createElement("div");

        var textNode = document.createElement("textarea");
        textNode.className = className;
        textNode.readOnly = true;
        textNode.cols = 80;
        text = icon + " " + text;
        // Roughly guess the number of rows by assuming lines wrap every 80 characters
        textNode.rows = text.split("\n").map(function(l) {
            return (l.length / 80) + 1;
        }).reduce(function(p, c) {
            return p + c;
        }, 0);
        textNode.value = text;
        outputNode.appendChild(textNode);

        document.getElementById("output").appendChild(outputNode);
    }

    function runforth() {
        var inputNode = document.getElementById("input");
        var input = inputNode.value.trim();
        if (input) {
            updateHistory(input);
            createOutputNode("\u2192", input, "user-output");

            try {
                var output = forth.run(input);
                if (output) {
                    createOutputNode("\u2190", output, "forth-output");
                }
            } catch (err) {
                createOutputNode("X", err, "error");
                throw err;
            } finally {
                showStack();
                inputNode.value = "";
                var outputNode = document.getElementById("output");
                outputNode.scrollTop = outputNode.scrollHeight;
            }
        }
    }

    function showStack() {
        var stack = forth.stack;
        var stackNode = document.getElementById("stack");
        // Clear stack
        while (stackNode.firstChild) stackNode.removeChild(stackNode.firstChild);

        for (var i = 1; i <= stack.length(); i++) {
            var element = document.createElement("span");
            element.className = "stack-element";
            element.textContent = String(stack.peek(i));
            stackNode.appendChild(element);
        }
    }

    return {
        interpret: function(event) {
            if (event.keyCode == 13 && !event.shiftKey)
                runforth();
            else if (event.keyCode == 80 && event.ctrlKey)
                useHistory(historySelection - 1);
            else if (event.keyCode == 78 && event.ctrlKey)
                useHistory(historySelection + 1);
        }
    };
}

global.repl = Repl();
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./kernel/forth.js":2}],2:[function(require,module,exports){
(function (global){
var Stack = require("./stack.js")

var Forth = (function(f) {
    var f = {};

    f.instructionPointer = 0;
    f.wordDefinitions = [];
    f.returnStack = new Stack("Return Stack");
    f.stack = new Stack("Stack");

    return f;
}());

Forth = (function ForthInterals(f) {
    "use strict";

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
    var input = "";
    var inputEnd = 0;
    var inputBufferPosition = 0;
    var inputBufferLength = -1;
    var EndOfInput = (function() {})();

    defjs("source", function source() {
        f.stack.push(inputBufferPosition + SOURCE);
        f.stack.push(inputBufferLength);
    });

    function _refill() {
        inputBufferPosition += inputBufferLength + 1;
        inputBufferLength = input.substring(inputBufferPosition).search(/\n/);
        toIn(0);
        return inputBufferPosition < inputEnd;
    }
    defjs("refill", function refill() {
        f.stack.push(_refill());
    });

    function readKey() {
        if (toIn() > inputBufferLength) {
            if (!_refill()) throw EndOfInput;
        }

        var keyPosition = inputBufferPosition + toIn();
        toIn(toIn() + 1);

        return input.charAt(keyPosition);
    }
    defjs("key", function key() {
        f.stack.push(readKey().charCodeAt(0));
    });

    function _parse(delimiter) {
        if (typeof delimiter === "number") delimiter = String.fromCharCode(delimiter);
        var address = SOURCE + inputBufferPosition + toIn();
        var length = 0;
        if (toIn() <= inputBufferLength) {
            var key = readKey();
            while (key !== delimiter) {
                length++;
                key = readKey();
            }
        } else {
            _refill();
        }
        return [address, length];
    }
    defjs("parse", function parse() {
        var addressLength = _parse(f.stack.pop());
        f.stack.push(addressLength[0]);
        f.stack.push(addressLength[1]);
    });

    function readWord(delimiter) {
        if (toIn() == inputBufferLength) {
            _refill();
        }
        delimiter = delimiter || /\s/;

        var word = "";
        var key = readKey();

        // Skip leading delimiters
        while (key.match(delimiter))
            key = readKey();

        while (!key.match(delimiter) && toIn() <= inputBufferLength) {
            word += key;
            key = readKey();
        }

        return word;
    }
    var wordBufferStart = f.wordDefinitions.length;
    f.wordDefinitions.length += 32;
    defjs("word", function word() {
        var delimiter = f.stack.pop();
        if (typeof delimiter === "number") delimiter = String.fromCharCode(delimiter);
        f.stack.push(wordBufferStart);

        var word = readWord(delimiter);
        var length = Math.min(word.length, 31);
        f.wordDefinitions[wordBufferStart] = length;
        for (var i = 0; i < length; i++) {
            f.wordDefinitions[wordBufferStart + i + 1] = word.charCodeAt(i);
        }
    });

    defjs("char", function char() {
        f.stack.push(readWord().charCodeAt(0));
    });

    defjs("accept", function accept() {
        var currentInputEnd = inputEnd;
        var currentInputBufferPosition = inputBufferPosition;
        var currentInputBufferLength = inputBufferLength;
        var currentToIn = toIn();

        var maxLength = f.stack.pop();
        var address = f.stack.pop();

        f.currentInstruction = function acceptCallback() {
            var lengthReceived = Math.min(maxLength, inputBufferLength);
            f.stack.push(1);
            setAddress(address, input.substring(inputBufferPosition, inputBufferPosition + lengthReceived).split("\n")[0]);

            inputEnd = currentInputEnd;
            inputBufferPosition = currentInputBufferPosition;
            inputBufferLength = currentInputBufferLength;
            toIn(currentToIn);
        };

        throw EndOfInput;
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
        var word = readWord();
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
        defheader(readWord());
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
            return input.charCodeAt(address - SOURCE);
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
        f.stack.push(findDefinition(readWord()).executionToken);
    });

    defjs("[']", function bracketTick() {
        f.wordDefinitions.push(_lit);
        f.wordDefinitions.push(findDefinition(readWord()).executionToken);
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
            f.wordDefinitions.push(readWord());
            f.wordDefinitions.push(JS);
        } else {
            jsInterop(readWord());
        }
    }, true);

    defjs("clearReturnStack", function clearReturnStack() {
        f.returnStack.clear();
    });

    defjs(":", function colon() {
        var name = readWord();
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
        var addressLength = _parse('"');
        var error = input.substring(addressLength[0], addressLength[0] + addressLength[1] + 1);
        f.wordDefinitions.push(function abortQuote() {
            if (f.stack.pop())
                abort(error);
        });
    }, true); // Immediate

    defjs("evaluate", function evaluate() {
        var currentInputEnd = inputEnd;
        var currentInputBufferPosition = inputBufferPosition;
        var currentInputBufferLength = inputBufferLength;
        var currentToIn = toIn();
        var currentInstructionPointer = f.instructionPointer;

        inputBufferLength = f.stack.pop();
        inputBufferPosition = f.stack.pop() - SOURCE;
        inputEnd = inputBufferPosition + inputBufferLength;
        toIn(0);

        var evaluateInstruction = interpret;

        try {
            // As js doesn't support tail call optimisation the
            // run function uses a trampoline to execute forth code
            while (true) {
                evaluateInstruction();
                evaluateInstruction = f.wordDefinitions[f.instructionPointer++];
            }
        } catch (err) {
            if (err == EndOfInput) {
                inputEnd = currentInputEnd;
                inputBufferPosition = currentInputBufferPosition;
                inputBufferLength = currentInputBufferLength;
                toIn(currentToIn);
                f.instructionPointer = currentInstructionPointer;
                // Pop interpret from returnStack
                f.returnStack.pop();
            } else {
                throw err;
            }
        }
    });

    function run(inp) {
        output = "";
        inputBufferPosition = input.length - 1;
        inputBufferLength = 0;
        input += inp + "\n";
        inputEnd = input.length - 1;
        _refill();

        try {
            // As js doesn't support tail call optimisation the
            // run function uses a trampoline to execute forth code
            while (true) {
                f.currentInstruction();
                f.currentInstruction = f.wordDefinitions[f.instructionPointer++];
            }
        } catch (err) {
            if (err !== EndOfInput) {
                console.log(output);
                console.log("Exception " + err + " at:\n" + printStackTrace());
                console.log(input.substring(inputBufferPosition, inputBufferPosition + inputBufferLength));
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
}(Forth))

Forth = (function ComparisonOperations(f) {

    f.defjs("=", function equal() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() == first);
    });

    f.defjs("<>", function notEqual() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() != first);
    });

    f.defjs("<", function lessThan() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() < first);
    });

    f.defjs(">", function greaterThan() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() > first);
    });

    f.defjs("<=", function lessThanEqual() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() <= first);
    });

    f.defjs(">=", function greaterThanEqual() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() >= first);
    });

    return f;
}(Forth));

Forth = (function StackOperations(f) {

    f.defjs("drop", function drop() {
        f.stack.pop();
    });

    f.defjs("swap", function swap() {
        var first = f.stack.pop();
        var second = f.stack.pop();
        f.stack.push(first);
        f.stack.push(second);
    });

    f.defjs("dup", function dup() {
        f.stack.push(f.stack.peek());
    });

    f.defjs("over", function over() {
        f.stack.push(f.stack.peek(2));
    });

    f.defjs("rot", function rot() {
        var first = f.stack.pop();
        var second = f.stack.pop();
        var third = f.stack.pop();
        f.stack.push(second);
        f.stack.push(first);
        f.stack.push(third);
    });

    f.defjs("-rot", function backRot() {
        var first = f.stack.pop();
        var second = f.stack.pop();
        var third = f.stack.pop();
        f.stack.push(first);
        f.stack.push(third);
        f.stack.push(second);
    });

    f.defjs("2drop", function twoDrop() {
        f.stack.pop();
        f.stack.pop();
    });

    f.defjs("2dup", function twoDup() {
        f.stack.push(f.stack.peek(2));
        f.stack.push(f.stack.peek(2));
    });

    f.defjs("2over", function twoOver() {
        f.stack.push(f.stack.peek(4));
        f.stack.push(f.stack.peek(4));
    });

    f.defjs("2swap", function twoSwap() {
        var first = f.stack.pop();
        var second = f.stack.pop();
        var third = f.stack.pop();
        var fourth = f.stack.pop();
        f.stack.push(second);
        f.stack.push(first);
        f.stack.push(fourth);
        f.stack.push(third);
    });

    f.defjs("?dup", function nonZeroDup() {
        var first = f.stack.peek();
        if (first !== 0) f.stack.push(first);
    });

    f.defjs("depth", function depth() {
        f.stack.push(f.stack.length());
    });

    // Return f.stack
    f.defjs(">r", function toR() {
        f.returnStack.push(f.stack.pop());
    });

    f.defjs("r>", function rFrom() {
        f.stack.push(f.returnStack.pop());
    });

    f.defjs("r@", function rFetch() {
        f.stack.push(f.returnStack.peek());
    });

    f.defjs("2r>", function twoRFrom() {
        var top = f.returnStack.pop();
        f.stack.push(f.returnStack.pop());
        f.stack.push(top);
    });

    f.defjs("2>r", function twoToR() {
        var top = f.stack.pop();
        f.returnStack.push(f.stack.pop());
        f.returnStack.push(top);
    });

    f.defjs("2r@", function twoRFetch() {
        f.stack.push(f.returnStack.peek(2));
        f.stack.push(f.returnStack.peek(1));
    });

    return f;
}(Forth));

Forth = (function ControlStructures(f) {
    var _do = f.defjs("_do", function _do() {
        f.returnStack.push(f.wordDefinitions[f.instructionPointer++]);
        var top = f.stack.pop();
        f.returnStack.push(f.stack.pop());
        f.returnStack.push(top);
    });
    f.defjs("do", function do_() {
        f.wordDefinitions.push(_do);
        f.wordDefinitions.push(0); // Dummy endLoop
        f.stack.push(f.wordDefinitions.length - 1);
    }, true); // Immediate

    function _plusLoop() {
        var step = f.stack.pop();
        var index = f.returnStack.pop();
        var limit = f.returnStack.pop();
        if (index < limit && index + step < limit || index >= limit && index + step >= limit) {
            f.returnStack.push(limit);
            f.returnStack.push(index + step);
            f.instructionPointer += f.wordDefinitions[f.instructionPointer];
        } else {
            f.returnStack.pop();
            f.instructionPointer++;
        }
    }

    var plusLoop = f.defjs("+loop", function plusLoop() {
        f.wordDefinitions.push(_plusLoop);
        var doPosition = f.stack.pop();
        f.wordDefinitions.push(doPosition - f.wordDefinitions.length + 1);
        f.wordDefinitions[doPosition] = f.wordDefinitions.length;
    }, true); // Immediate

    f.defjs("loop", function loop() {
        f.wordDefinitions.push(f._lit);
        f.wordDefinitions.push(1);
        plusLoop();
    }, true); // Immediate

    f.defjs("unloop", function unloop() {
        f.returnStack.pop();
        f.returnStack.pop();
        f.returnStack.pop();
    });

    f.defjs("leave", function leave() {
        f.returnStack.pop();
        f.returnStack.pop();
        f.instructionPointer = f.returnStack.pop();
    });

    f.defjs("i", function i() {
        f.stack.push(f.returnStack.peek());
    });

    f.defjs("j", function j() {
        f.stack.push(f.returnStack.peek(4));
    });

    f.defjs("recurse", function recurse() {
        f.wordDefinitions.push(f.wordDefinitions[f._latest() + 1]);
    }, true); // Immediate

    return f;
}(Forth));

module.exports = Forth;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./stack.js":3}],3:[function(require,module,exports){
function Stack(name) {
    var data = [];

    this.pop = function() {
        if (data.length > 0)
            return data.pop();
        else
            throw "Stack empty: " + name;
    }
    
    this.push = function(element) {
        data.push(element);
    }
    
    this.peek = function(offset) {
        var index = data.length - (offset || 1);
        if (0 <= index && index < data.length)
            return data[index];
        else
            throw "Attempted to peek at invalid stack index " + index + ": " + name;
    }
    
    this.length = function() {
        return data.length;
    }
    
    this.clear = function() {
        data.length = 0;
    }
}

module.exports = Stack;
},{}]},{},[1])
//# sourceMappingURL=bundle.js.map
