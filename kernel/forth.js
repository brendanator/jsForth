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