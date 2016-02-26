var InputExceptions = require("./input-exceptions.js");

function Interpreter(f) {
    function run(input, outputCallback, sourceId) {
        f.outputCallback = outputCallback;

        f._newInput(input, sourceId || 0);
        f._output = "";

        try {
            runInterpreter();
        } catch (err) {
            if (err !== InputExceptions.WaitingOnInput) {
                console.error("Exception " + err + " at:\n" + printStackTrace());
                console.error(f._currentInput.inputBuffer());
                console.error(f._output);
                f.currentInstruction = quit;
                f.stack.clear();
                outputCallback(err, f._output);
                throw err;
            }
        }

        outputCallback(null, f._output);
    }

    function runInterpreter() {
        // Run while there is still input to consume 
        while (f._currentInput) {
            try {
                // As js doesn't support tail call optimisation the
                // run function uses a trampoline to execute forth code
                while (true) {
                    f.currentInstruction();
                    f.currentInstruction = f.dataSpace[f.instructionPointer++];
                }
            } catch (err) {
                if (err === InputExceptions.EndOfInput) {
                    f._popInput();
                } else {
                    throw err;
                }
            }
        }
    }

    function printStackTrace() {
        var stackTrace = "    " + f.currentInstruction.name + " @ " + (f.instructionPointer - 1);
        for (var i = f.returnStack.length - 1; i >= 0; i--) {
            var instruction = f.returnStack[i];
            stackTrace += "\n    " + f.dataSpace[instruction - 1].name + " @ " + (instruction - 1);
        }
        return stackTrace;
    }

    f._evaluate = f.defjs("evaluate", function evaluate() {
        var length = f.stack.pop();
        var address = f.stack.pop();
        if (address < 0) {
            var position = address - f._INPUT_SOURCE;
            f._subInput(position, length);
        } else {
            var string = "";
            for (var i = 0; i < length; i++) {
                string += String.fromCharCode(f._getAddress(address + i));
            }
            f._newInput(string, -1);
        }

        f.instructionPointer = interpretInstruction;
    });

    function interpretWord() {
        var word = f._readWord();
        while (!word) {
            if (!f._currentInput.refill()) throw InputExceptions.EndOfInput;
            word = f._readWord();
        }

        var definition = f.findDefinition(word);
        if (definition) {
            if (!f.compiling() || definition.immediate) {
                f.dataSpace[definition.executionToken]();
                return;
            } else {
                f.dataSpace.push(f.dataSpace[definition.executionToken]);
            }
        } else {
            var num = f._parseFloatInBase(word);
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
    f.defjs("interpret", function interpret() {
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
        var error = f._currentInput.parse('"'.charCodeAt(0))[2];
        f.dataSpace.push(function abortQuote() {
            if (f.stack.pop())
                abort(error);
        });
    }, true); // Immediate

    f.defjs("execute", function execute() {
        f.dataSpace[f.stack.pop()]();
    });

    // Set initial instruction
    f.currentInstruction = quit;
    f.run = run;

    return f;
}

module.exports = Interpreter;