(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var Forth = require("./kernel/forth.js");

function Repl() {
    "use strict";

    var forth = Forth();

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

},{"./kernel/forth.js":5}],2:[function(require,module,exports){
function ComparisonOperations(f) {
    f.defjs("true", function _true() {
        f.stack.push(true);
    });

    f.defjs("false", function _false() {
        f.stack.push(false);
    });

    f.defjs("and", function and() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() & first);
    });

    f.defjs("or", function or() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() | first);
    });

    f.defjs("xor", function xor() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() ^ first);
    });

    f.defjs("invert", function invert() {
        f.stack.push(~f.stack.pop());
    });

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
}

module.exports = ComparisonOperations;
},{}],3:[function(require,module,exports){
function ControlStructures(f) {
    // if, else, then
    f.defjs("jump", function jump() {
        f.instructionPointer += f.wordDefinitions[f.instructionPointer];
    });

    f.defjs("jumpIfFalse", function jumpIfFalse() {
        if (!f.stack.pop()) {
            f.instructionPointer += f.wordDefinitions[f.instructionPointer];
        } else {
            f.instructionPointer++; // Skip the offset
        }
    });


    // do, loop, +loop, unloop, leave, i, j
    function _do() {
        f.returnStack.push(f.wordDefinitions[f.instructionPointer++]);
        var top = f.stack.pop();
        f.returnStack.push(f.stack.pop());
        f.returnStack.push(top);
    }

    f.defjs("do", function compileDo() {
        f.wordDefinitions.push(_do);
        f.wordDefinitions.push(0); // Dummy endLoop
        f.stack.push(f.wordDefinitions.length - 1);
    }, true); // Immediate

    function plusLoop() {
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

    var compilePlusLoop = f.defjs("+loop", function compilePlusLoop() {
        f.wordDefinitions.push(plusLoop);
        var doPosition = f.stack.pop();
        f.wordDefinitions.push(doPosition - f.wordDefinitions.length + 1);
        f.wordDefinitions[doPosition] = f.wordDefinitions.length;
    }, true); // Immediate

    f.defjs("loop", function loop() {
        f.wordDefinitions.push(f._lit);
        f.wordDefinitions.push(1);
        compilePlusLoop();
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


    // recurse
    f.defjs("recurse", function recurse() {
        f.wordDefinitions.push(f.wordDefinitions[f._latest() + 1]);
    }, true); // Immediate


    // does
    function _does() {
        var wordPosition = f._latest();
        var doDoesPosition = f.instructionPointer;

        f.wordDefinitions[wordPosition + 1] = function doDoes() {
            f.stack.push(wordPosition + 2);
            f.returnStack.push(f.instructionPointer);
            f.instructionPointer = doDoesPosition;
        };

        f.instructionPointer = f.returnStack.pop();
    }

    f.defjs("does>", function compileDoes() {
        f.wordDefinitions.push(_does);
    }, true); // Immediate

    return f;
}

module.exports = ControlStructures;
},{}],4:[function(require,module,exports){
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
},{}],5:[function(require,module,exports){
var Input = require("./input.js");

function ForthInterpreter(f) {
    var base = f.defvar("base", 10);
    var toIn = f.defvar(">in", 0);

    var _lit = f.defjs("lit", function lit() {
        f.stack.push(f.wordDefinitions[f.instructionPointer]);
        f.instructionPointer++;
    });

    var INPUT_SOURCE = 1 << 31; // Address offset to indicate input addresses 

    f.defjs("source", function source() {
        var positionLength = f._currentInput.source();
        f.stack.push(INPUT_SOURCE + positionLength[0]);
        f.stack.push(positionLength[1]);
    });

    f.defjs("refill", function refill() {
        f.stack.push(f._currentInput.refill());
    });

    f.defjs("key", function key() {
        f.stack.push(f._currentInput.readKey().charCodeAt(0));
    });

    f.defjs("parse", function parse() {
        var addressLength = f._currentInput.parse(f.stack.pop());
        f.stack.push(INPUT_SOURCE + addressLength[0]);
        f.stack.push(addressLength[1]);
    });

    f.readWord = function readWord() {
        return f._currentInput.readWord();
    };

    var wordBufferStart = f.wordDefinitions.length;
    f.wordDefinitions.length += 32;
    f.defjs("word", function word() {
        var delimiter = f.stack.pop();
        if (typeof delimiter === "number") delimiter = String.fromCharCode(delimiter);
        f.stack.push(wordBufferStart);

        var word = f.readWord(delimiter);
        var length = Math.min(word.length, 31);
        f.wordDefinitions[wordBufferStart] = length;
        for (var i = 0; i < length; i++) {
            f.wordDefinitions[wordBufferStart + i + 1] = word.charCodeAt(i);
        }
    });

    f.defjs("char", function char() {
        f.stack.push(f.readWord().charCodeAt(0));
    });

    f.defjs("accept", function accept() {
        var savedInput = f._currentInput;
        var savedToIn = toIn();

        var maxLength = f.stack.pop();
        var address = f.stack.pop();

        f.currentInstruction = function acceptCallback() {
            var received = f._currentInput.inputBuffer().substring(0, maxLength).split("\n")[0];

            f.stack.push(received.length);
            for (var i = 0; i < received.length; i++) {
                f._setAddress(address + i, received[i]);
            }

            f._currentInput = savedInput;
            toIn(savedToIn);
        };

        throw Input.EndOfInput;
    });

    var output = "";

    f.defjs("cr", function cr() {
        output += "\n";
    });

    f.defjs(".", function dot() {
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

    f.defjs("emit", function emit() {
        var value = f.stack.pop();
        if (typeof value === "number")
            output += String.fromCharCode(value);
        else
            output += value;
    });

    f.defjs("type", function type() {
        var length = f.stack.pop();
        var address = f.stack.pop();
        for (var i = 0; i < length; i++) {
            var value = f._getAddress(address + i);
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
        var word = f.readWord();
        var definition = f.findDefinition(word);
        if (definition) {
            if (!f.compiling() || definition.immediate) {
                f.wordDefinitions[definition.executionToken]();
                return;
            } else {
                f.wordDefinitions.push(f.wordDefinitions[definition.executionToken]);
            }
        } else {
            var num = parseFloat(word, base());
            if (isNaN(num)) throw "Word not defined: " + word;
            if (f.compiling()) {
                f.wordDefinitions.push(_lit);
                f.wordDefinitions.push(num);
            } else {
                f.stack.push(num);
            }
        }
    }

    f.defjs("execute", function execute() {
        f.wordDefinitions[f.stack.pop()]();
    });


    var interpretInstruction = f.wordDefinitions.length + 1;
    var interpret = f.defjs("interpret", function interpret() {
        f.instructionPointer = interpretInstruction; // Loop after interpret word is called
        interpretWord();
    });

    var quit = f.defjs("quit", function quit() {
        f.compiling(false); // Enter interpretation state
        f.returnStack.clear(); // Clear return stack
        f.instructionPointer = interpretInstruction; // Run the interpreter
    });

    function abort(error) {
        f.stack.clear();
        throw error || "";
    }
    f.defjs("abort", abort);

    f.defjs('abort"', function abortQuote() {
        var error = f._currentInput.parse('"')[2];
        f.wordDefinitions.push(function abortQuote() {
            if (f.stack.pop())
                abort(error);
        });
    }, true); // Immediate

    f.defjs("evaluate", function evaluate() {
        var savedInput = f._currentInput;
        var savedToIn = toIn();

        var length = f.stack.pop();
        var position = f.stack.pop() - INPUT_SOURCE;
        f._currentInput = f._currentInput.subInput(position, length);

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
                f._currentInput = savedInput;
                toIn(savedToIn);
                f.instructionPointer = savedInstructionPointer;
                // Pop interpret from returnStack
                // f.returnStack.pop();
            } else {
                throw err;
            }
        }
    });

    var inputString = "";

    function run(input) {
        var startPosition = inputString.length;
        inputString += input;
        f._currentInput = Input(inputString, startPosition, inputString.length, toIn);

        output = "";

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
                console.log(f._currentInput.inputBuffer());
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

    f.run = run;
    f.currentInstruction = quit;
    f._lit = _lit;
    f._INPUT_SOURCE = INPUT_SOURCE;
    f._base = base;
    return f;
}

var Stack = require("./stack.js");
var Definitions = require("./definitions.js");
var NumericOperations = require("./numeric-operations.js");
var BooleanOperations = require("./boolean-operations.js");
var StackOperations = require("./stack-operations.js");
var MemoryOperations = require("./memory-operations.js");
var ControlStructures = require("./control-structures.js");
var JsInterop = require("./js-interop.js");

function Forth() {
    var forth = {
        instructionPointer: 0,
        wordDefinitions: [],
        returnStack: new Stack("Return Stack"),
        stack: new Stack("Stack")
    };

    Definitions(forth);
    NumericOperations(forth);
    BooleanOperations(forth);
    StackOperations(forth);
    MemoryOperations(forth);
    ControlStructures(forth);
    JsInterop(forth);
    ForthInterpreter(forth);

    return forth;
}

module.exports = Forth;
},{"./boolean-operations.js":2,"./control-structures.js":3,"./definitions.js":4,"./input.js":6,"./js-interop.js":7,"./memory-operations.js":8,"./numeric-operations.js":9,"./stack-operations.js":10,"./stack.js":11}],6:[function(require,module,exports){
var EndOfInput = (function() {})();

function Input(input, startPosition, endPosition, toIn) {
    var inputBufferPosition = startPosition;
    var inputBufferLength = -1;
    refill();

    function refill() {
        inputBufferPosition += inputBufferLength + 1;

        inputBufferLength = input.substring(inputBufferPosition).search(/\n/);
        if (inputBufferLength == -1 || inputBufferPosition + inputBufferLength > endPosition) 
          inputBufferLength = endPosition - inputBufferPosition;

        toIn(0);
        return inputBufferPosition < endPosition;
    }

    function readKey() {
        if (toIn() > inputBufferLength) {
            if (!refill()) throw EndOfInput;
        }

        var keyPosition = inputBufferPosition + toIn();
        toIn(toIn() + 1);
        if (keyPosition < endPosition) {
          return input.charAt(keyPosition);
        } else {
          return " ";
        }
    }

    function parse(delimiter) {
        if (typeof delimiter === "number") delimiter = String.fromCharCode(delimiter);
        var address = inputBufferPosition + toIn();
        var length = 0;
        var result = "";
        if (toIn() <= inputBufferLength) {
            var key = readKey();
            while (key !== delimiter) {
                length++;
                result += key;
                key = readKey();
            }
        } else {
            refill();
        }
        return [address, length, result];
    }

    function readWord(delimiter) {
        if (toIn() >= inputBufferLength) {
            refill();
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

    function source() {
      return [inputBufferPosition, inputBufferLength];
    }

    function inputBuffer() {
      return input.substring(inputBufferPosition, inputBufferPosition + inputBufferLength);
    }

    function subInput(position, length) {
      return Input(input, position, position + length, toIn);
    }

    function charCodeAt(index) {
      return input.charCodeAt(index);
    }

    return {
      readWord: readWord,
      readKey: readKey,
      parse: parse,
      refill: refill,
      inputBuffer: inputBuffer,
      source: source,
      charCodeAt: charCodeAt,
      subInput: subInput
    };
}

module.exports = Input;
module.EndOfInput = EndOfInput;
},{}],7:[function(require,module,exports){
(function (global){
function JsInterop(f) {
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

    var JS = f.defjs("js", function js() {
        jsInterop(f.stack.pop());
    });

    f.defjs("js", function js() {
        if (f.compiling()) {
            f.wordDefinitions.push(f._lit);
            f.wordDefinitions.push(f.readWord());
            f.wordDefinitions.push(JS);
        } else {
            jsInterop(f.readWord());
        }
    }, true);

    return f;
}

module.exports = JsInterop;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],8:[function(require,module,exports){
function MemoryOperations(f) {
    function getAddress(address) {
        if (address < 0) {
            return f._currentInput.charCodeAt(address - f._INPUT_SOURCE);
        } else {
            var value = f.wordDefinitions[address];
            if (typeof value == "string")
                return value.charCodeAt(0);
            else
                return value;
        }
    }

    function setAddress(address, value) {
        if (address < 0) {
            throw "Illegal attempt to change input";
        } else {
            f.wordDefinitions[address] = value;
        }
    }

    f.defjs("!", function store() {
        var address = f.stack.pop();
        var data = f.stack.pop();
        setAddress(address, data);
    });

    f.defjs("@", function fetch() {
        var address = f.stack.pop();
        f.stack.push(getAddress(address));
    });

    f.defjs("+!", function addStore() {
        var address = f.stack.pop();
        var data = f.stack.pop();
        f.wordDefinitions[address] = f.wordDefinitions[address] + data;
    });

    f.defjs("-!", function subtractStore() {
        var address = f.stack.pop();
        var data = f.stack.pop();
        f.wordDefinitions[address] = f.wordDefinitions[address] - data;
    });

    f.defjs("here", function here() {
        f.stack.push(f.wordDefinitions.length);
    });

    f._getAddress = getAddress;
    f._setAddress = setAddress;
    return f;
}

module.exports = MemoryOperations;
},{}],9:[function(require,module,exports){
function NumericOperations(f) {
    f.defjs("1+", function inc() {
        f.stack.push(f.stack.pop() + 1);
    });

    f.defjs("1-", function dec() {
        f.stack.push(f.stack.pop() - 1);
    });

    f.defjs("2*", function inc() {
        f.stack.push(f.stack.pop() << 1);
    });

    f.defjs("2/", function inc() {
        f.stack.push(f.stack.pop() >> 1);
    });

    f.defjs("+", function plus() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() + first);
    });

    f.defjs("-", function minus() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() - first);
    });

    f.defjs("*", function multiply() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() * first);
    });

    f.defjs("/", function divide() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() / first);
    });

    f.defjs("mod", function mod() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() % first);
    });

    f.defjs("um/mod", function unsignedDivideMod() {
        var divisor = f.stack.pop() >>> 0;
        var bigPart = f.stack.pop() >>> 0;
        var smallPart = f.stack.pop();
        var quotient = (bigPart % divisor) * Math.floor(maxUInt / divisor) + Math.floor(smallPart / divisor);
        var mod = Math.floor((bigPart % divisor) + (maxUInt % divisor) + (smallPart % divisor) & divisor);
        f.stack.push(mod);
        f.stack.push(quotient);
    });

    f.defjs("fm/mod", function flooredDivideMod() {
        var divisor = f.stack.pop();
        var bigPart = f.stack.pop();
        var smallPart = f.stack.pop();
        var quotient = (bigPart % divisor) * Math.floor(maxUInt / divisor) + Math.floor(smallPart / divisor);
        var mod = Math.floor((bigPart % divisor) + (maxUInt % divisor) + (smallPart % divisor) & divisor);
        f.stack.push(mod);
        f.stack.push(quotient);
    });

    f.defjs("sm/rem", function symmetricDivideRem() {
        var divisor = f.stack.pop();
        var bigPart = f.stack.pop();
        var smallPart = f.stack.pop();
        var quotient = (bigPart % divisor) * Math.floor(maxUInt / divisor) + Math.trunc(smallPart / divisor);
        var rem = Math.floor((bigPart % divisor) + (maxUInt % divisor) + (smallPart % divisor) & divisor);
        f.stack.push(rem);
        f.stack.push(quotient);
    });

    f.defjs("abs", function abs() {
        f.stack.push(Math.abs(f.stack.pop()));
    });

    f.defjs("lshift", function lshift() {
        var shift = f.stack.pop();
        var num = f.stack.pop();
        f.stack.push(num << shift);
    });

    f.defjs("rshift", function rshift() {
        var shift = f.stack.pop();
        var num = f.stack.pop();
        f.stack.push(num >>> shift);
    });

    f.defjs("max", function max() {
        f.stack.push(Math.max(f.stack.pop(), f.stack.pop()));
    });

    f.defjs("min", function min() {
        f.stack.push(Math.min(f.stack.pop(), f.stack.pop()));
    });

    f.defjs("negate", function negate() {
        f.stack.push(-f.stack.pop());
    });

    f.defjs("unsigned", function unsigned() {
        f.stack.push(f.stack.pop() >>> 0);
    });

    // Numeric output
    var numericOutputStart = f.wordDefinitions.length;
    var numericOutput = "";
    f.wordDefinitions.length += 128;

    f.defjs("<#", function initialiseNumericOutput() {
        numericOutput = "";
    });

    f.defjs("hold", function hold() {
        var value = f.stack.pop();
        if (typeof value === "number")
            value = String.fromCharCode(value);
        numericOutput += value;
    });

    f.defjs("#>", function finishNumericOutput() {
        f.stack.pop();
        f.stack.pop();
        for (var i = 0; i < numericOutput.length; i++) {
            f.wordDefinitions[numericOutputStart + i] = numericOutput[numericOutput.length - i - 1];
        }
        f.stack.push(numericOutputStart);
        f.stack.push(numericOutput.length);
    });

    f.defjs("sign", function sign() {
        if (f.stack.pop() < 0)
            numericOutput += "-";
    });

    var maxUInt = Math.pow(2, 32);
    f.defjs("#", function writeNextNumericOutput() {
        var bigPart = f.stack.pop() >>> 0;
        var smallPart = f.stack.pop() >>> 0;
        var base = f._base();

        numericOutput += Math.floor(smallPart % base).toString(base).toUpperCase();

        smallPart = (bigPart % base) * Math.floor(maxUInt / base) + Math.floor(smallPart / base);
        bigPart = Math.floor(bigPart / base);
        f.stack.push(smallPart);
        f.stack.push(bigPart);
    });

    f.defjs("#S", function writeAllNumericOutput() {
        var bigPart = f.stack.pop() >>> 0;
        var smallPart = f.stack.pop() >>> 0;
        var base = f._base();

        if (smallPart > 0 || bigPart > 0) {
            while (smallPart > 0 || bigPart > 0) {
                numericOutput += Math.floor(smallPart % base).toString(base).toUpperCase();
                smallPart = (bigPart % base) * Math.floor(maxUInt / base) + Math.floor(smallPart / base);
                bigPart = Math.floor(bigPart / base);
            }
        } else {
            numericOutput += "0";
        }

        f.stack.push(0);
        f.stack.push(0);
    });

    f.defjs(">number", function toNumber() {
        var base = f._base();
        var length = f.stack.pop();
        var address = f.stack.pop();
        var bigPart = f.stack.pop() >>> 0;
        var smallPart = f.stack.pop() >>> 0;
        var unconverted = length;

        for (var i = 0; i < length; i++) {
            var next = parseInt(String.fromCharCode(f._getAddress(address)), base);

            if (isNaN(next)) {
                break;
            } else {
                address++;
                unconverted--;
                var temp = (smallPart * base) + next;
                smallPart = temp % maxUInt;
                bigPart = (bigPart * base) + Math.floor(temp / maxUInt);
            }
        }

        f.stack.push(smallPart);
        f.stack.push(bigPart);
        f.stack.push(address);
        f.stack.push(unconverted);
    });

    return f;
}

module.exports = NumericOperations;
},{}],10:[function(require,module,exports){
function StackOperations(f) {
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
}

module.exports = StackOperations;
},{}],11:[function(require,module,exports){
function Stack(name) {
    var data = [];

    this.pop = function() {
        if (data.length > 0)
            return data.pop();
        else
            throw "Stack empty: " + name;
    };

    this.push = function(element) {
        data.push(element);
    };

    this.peek = function(offset) {
        var index = data.length - (offset || 1);
        if (0 <= index && index < data.length)
            return data[index];
        else
            throw "Attempted to peek at invalid stack index " + index + ": " + name;
    };

    this.length = function() {
        return data.length;
    };

    this.clear = function() {
        data.length = 0;
    };
}

module.exports = Stack;
},{}]},{},[1])
//# sourceMappingURL=bundle.js.map
