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
    loadForth("forth/ans-forth-tests.fth");

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

},{"./kernel/forth.js":6}],2:[function(require,module,exports){
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
        f.instructionPointer += f.dataSpace[f.instructionPointer];
    });

    f.defjs("jumpIfFalse", function jumpIfFalse() {
        if (!f.stack.pop()) {
            f.instructionPointer += f.dataSpace[f.instructionPointer];
        } else {
            f.instructionPointer++; // Skip the offset
        }
    });


    // do, loop, +loop, unloop, leave, i, j
    function _do() {
        f.returnStack.push(f.dataSpace[f.instructionPointer++]);
        var top = f.stack.pop();
        f.returnStack.push(f.stack.pop());
        f.returnStack.push(top);
    }

    f.defjs("do", function compileDo() {
        f.dataSpace.push(_do);
        f.dataSpace.push(0); // Dummy endLoop
        f.stack.push(f.dataSpace.length - 1);
    }, true); // Immediate

    function plusLoop() {
        var step = f.stack.pop();
        var index = f.returnStack.pop();
        var limit = f.returnStack.pop();
        if (index < limit && index + step < limit || index >= limit && index + step >= limit) {
            f.returnStack.push(limit);
            f.returnStack.push(index + step);
            f.instructionPointer += f.dataSpace[f.instructionPointer];
        } else {
            f.returnStack.pop();
            f.instructionPointer++;
        }
    }

    var compilePlusLoop = f.defjs("+loop", function compilePlusLoop() {
        f.dataSpace.push(plusLoop);
        var doPosition = f.stack.pop();
        f.dataSpace.push(doPosition - f.dataSpace.length + 1);
        f.dataSpace[doPosition] = f.dataSpace.length;
    }, true); // Immediate

    f.defjs("loop", function loop() {
        f.dataSpace.push(f._lit);
        f.dataSpace.push(1);
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
        f.dataSpace.push(f.dataSpace[f._latest() + 1]);
    }, true); // Immediate


    // does
    function _does() {
        var wordPosition = f._latest();
        var doDoesPosition = f.instructionPointer;

        f.dataSpace[wordPosition + 1] = function doDoes() {
            f.stack.push(wordPosition + 2);
            f.returnStack.push(f.instructionPointer);
            f.instructionPointer = doDoesPosition;
        };

        f.instructionPointer = f.returnStack.pop();
    }

    f.defjs("does>", function compileDoes() {
        f.dataSpace.push(_does);
    }, true); // Immediate

    return f;
}

module.exports = ControlStructures;
},{}],4:[function(require,module,exports){
var Stack = require("./stack.js");

function Data(f) {
    f.instructionPointer = 0;
    f.dataSpace = [];
    f.returnStack = new Stack("Return Stack");
    f.stack = new Stack("Stack");

    return f;
}

module.exports = Data;
},{"./stack.js":14}],5:[function(require,module,exports){
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
},{}],6:[function(require,module,exports){
var Data = require("./data.js"); 
var Definitions = require("./definitions.js");
var NumericOperations = require("./numeric-operations.js");
var BooleanOperations = require("./boolean-operations.js");
var StackOperations = require("./stack-operations.js");
var MemoryOperations = require("./memory-operations.js");
var ControlStructures = require("./control-structures.js");
var JsInterop = require("./js-interop.js");
var Input = require("./input.js");
var Output = require("./output.js")
var Interpreter = require("./interpreter.js")

function Forth() {
    var forth = {};

    Data(forth);
    Definitions(forth);
    Input(forth);
    NumericOperations(forth);
    BooleanOperations(forth);
    StackOperations(forth);
    MemoryOperations(forth);
    ControlStructures(forth);
    Output(forth);
    JsInterop(forth);
    Interpreter(forth);

    return forth;
}

module.exports = Forth;
},{"./boolean-operations.js":2,"./control-structures.js":3,"./data.js":4,"./definitions.js":5,"./input.js":7,"./interpreter.js":8,"./js-interop.js":9,"./memory-operations.js":10,"./numeric-operations.js":11,"./output.js":12,"./stack-operations.js":13}],7:[function(require,module,exports){
var EndOfInput = (function() {})();

function InputWindow(input, startPosition, endPosition, toIn) {
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
        return InputWindow(input, position, position + length, toIn);
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

function Input(f) {
    f._base = f.defvar("base", 10);

    // Input buffer pointer
    var toIn = f.defvar(">in", 0);

    // Address offset to indicate input addresses 
    var INPUT_SOURCE = 1 << 31;

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

    function readWord(delimiter) {
        return f._currentInput.readWord(delimiter);
    };

    var wordBufferStart = f.dataSpace.length;
    f.dataSpace.length += 32;
    f.defjs("word", function word() {
        var delimiter = f.stack.pop();
        if (typeof delimiter === "number") delimiter = String.fromCharCode(delimiter);
        f.stack.push(wordBufferStart);

        var word = readWord(delimiter);
        var length = Math.min(word.length, 31);
        f.dataSpace[wordBufferStart] = length;
        for (var i = 0; i < length; i++) {
            f.dataSpace[wordBufferStart + i + 1] = word.charCodeAt(i);
        }
    });

    f.defjs("char", function char() {
        f.stack.push(readWord().charCodeAt(0));
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
    function _parseFloat(string) {
        var base = f._base();

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

    var inputString = "";

    function newInput(input) {
        var startPosition = inputString.length;
        inputString += input;
        f._currentInput = InputWindow(inputString, startPosition, inputString.length, toIn);
    }

    var inputStack = [];

    function subInput(position, length) {
        inputStack.push({
            input: f._currentInput,
            toIn: toIn()
        });
        f._currentInput = f._currentInput.subInput(position, length);
    }

    function popInput() {
        var savedInput = inputStack.pop();
        f._currentInput = savedInput.input;
        toIn(savedInput.toIn);
    }

    f._readWord = readWord;
    f._newInput = newInput;
    f._subInput = subInput;
    f._popInput = popInput;
    f._parseFloat = _parseFloat;
    f._INPUT_SOURCE = INPUT_SOURCE;
    return f;
}

module.exports = Input;
module.EndOfInput = EndOfInput;
},{}],8:[function(require,module,exports){
var Input = require("./input.js");

function Interpreter(f) {
    function run(input) {
        f._newInput(input);
        f._output = "";

        try {
            // As js doesn't support tail call optimisation the
            // run function uses a trampoline to execute forth code
            while (true) {
                f.currentInstruction();
                f.currentInstruction = f.dataSpace[f.instructionPointer++];
            }
        } catch (err) {
            if (err !== Input.EndOfInput) {
                console.error("Exception " + err + " at:\n" + printStackTrace());
                console.error(f._currentInput.inputBuffer());
                console.error(f._output);
                f.currentInstruction = quit;
                f.stack.clear();
                throw err;
            }
        }
        return f._output;
    }

    function interpretWord() {
        var word = f._readWord();
        var definition = f.findDefinition(word);
        if (definition) {
            if (!f.compiling() || definition.immediate) {
                f.dataSpace[definition.executionToken]();
                return;
            } else {
                f.dataSpace.push(f.dataSpace[definition.executionToken]);
            }
        } else {
            var num = f._parseFloat(word);
            if (isNaN(num)) throw "Word not defined: " + word;
            if (f.compiling()) {
                f.dataSpace.push(f._lit);
                f.dataSpace.push(num);
            } else {
                f.stack.push(num);
            }
        }
    }

    var interpretInstruction = f.dataSpace.length + 1;
    var interpret = f.defjs("interpret", function interpret() {
        f.instructionPointer = interpretInstruction; // Loop after interpret word is called
        interpretWord();
    });

    var quit = f.defjs("quit", function quit() {
        f.compiling(false); // Enter interpretation state
        f.returnStack.clear(); // Clear return stack
        f.instructionPointer = interpretInstruction; // Run the interpreter
    });

    var abort = f.defjs("abort", function abort(error) {
        f.stack.clear();
        throw error || "";
    });

    f.defjs('abort"', function abortQuote() {
        var error = f._currentInput.parse('"')[2];
        f.dataSpace.push(function abortQuote() {
            if (f.stack.pop())
                abort(error);
        });
    }, true); // Immediate

    f.defjs("execute", function execute() {
        f.dataSpace[f.stack.pop()]();
    });

    f.defjs("evaluate", function evaluate() {
        var length = f.stack.pop();
        var position = f.stack.pop() - f._INPUT_SOURCE;
        f._subInput(position, length);

        var savedInstructionPointer = f.instructionPointer;

        var evaluateInstruction = interpret;

        try {
            // As js doesn't support tail call optimisation the
            // run function uses a trampoline to execute forth code
            while (true) {
                evaluateInstruction();
                evaluateInstruction = f.dataSpace[f.instructionPointer++];
            }
        } catch (err) {
            if (err == Input.EndOfInput) {
                f._popInput();
                f.instructionPointer = savedInstructionPointer;
            } else {
                throw err;
            }
        }
    });

    function printStackTrace() {
        var stackTrace = "    " + f.currentInstruction.name + " @ " + (f.instructionPointer - 1);
        for (var i = f.returnStack.length - 1; i >= 0; i--) {
            var instruction = f.returnStack[i];
            stackTrace += "\n    " + f.dataSpace[instruction - 1].name + " @ " + (instruction - 1);
        }
        return stackTrace;
    }

    f.currentInstruction = quit;
    f.run = run;

    return f;
}

module.exports = Interpreter;
},{"./input.js":7}],9:[function(require,module,exports){
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
            f.dataSpace.push(f._lit);
            f.dataSpace.push(f._readWord());
            f.dataSpace.push(JS);
        } else {
            jsInterop(f._readWord());
        }
    }, true);

    return f;
}

module.exports = JsInterop;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],10:[function(require,module,exports){
function MemoryOperations(f) {
    function getAddress(address) {
        if (address < 0) {
            return f._currentInput.charCodeAt(address - f._INPUT_SOURCE);
        } else {
            var value = f.dataSpace[address];
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
            f.dataSpace[address] = value;
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
        f.dataSpace[address] = f.dataSpace[address] + data;
    });

    f.defjs("-!", function subtractStore() {
        var address = f.stack.pop();
        var data = f.stack.pop();
        f.dataSpace[address] = f.dataSpace[address] - data;
    });

    f.defjs("here", function here() {
        f.stack.push(f.dataSpace.length);
    });

    f._getAddress = getAddress;
    f._setAddress = setAddress;
    return f;
}

module.exports = MemoryOperations;
},{}],11:[function(require,module,exports){
function NumericOperations(f) {
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

    f.defjs("2*", function inc() {
        f.stack.push(f.stack.pop() << 1);
    });

    f.defjs("2/", function inc() {
        f.stack.push(f.stack.pop() >> 1);
    });

    f.defjs("mod", function mod() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() % first);
    });

    var maxUInt = Math.pow(2, 32);

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

    return f;
}

module.exports = NumericOperations;
},{}],12:[function(require,module,exports){
function Output(f) {

    f._output = "";

    f.defjs("cr", function cr() {
        f._output += "\n";
    });

    f.defjs(".", function dot() {
        var value;
        var top = f.stack.pop();

        if (typeof top === "undefined")
            value = "undefined";
        else if (top === null)
            value = "null";
        else
            value = top.toString(f._base()); // Output numbers in current base

        f._output += value + " ";
    });

    f.defjs("emit", function emit() {
        var value = f.stack.pop();
        if (typeof value === "number")
            f._output += String.fromCharCode(value);
        else
            f._output += value;
    });

    f.defjs("type", function type() {
        var length = f.stack.pop();
        var address = f.stack.pop();
        for (var i = 0; i < length; i++) {
            var value = f._getAddress(address + i);
            if (typeof value === "number") {
                f._output += String.fromCharCode(value);
            } else
                f._output += value;
        }
    });

    // Numeric output
    var maxUInt = Math.pow(2, 32);

    var numericOutputStart = f.dataSpace.length;
    var numericOutput = "";
    f.dataSpace.length += 128;

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
            f.dataSpace[numericOutputStart + i] = numericOutput[numericOutput.length - i - 1];
        }
        f.stack.push(numericOutputStart);
        f.stack.push(numericOutput.length);
    });

    f.defjs("sign", function sign() {
        if (f.stack.pop() < 0)
            numericOutput += "-";
    });

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

module.exports = Output;
},{}],13:[function(require,module,exports){
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
},{}],14:[function(require,module,exports){
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
