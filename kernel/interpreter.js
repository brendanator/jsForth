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