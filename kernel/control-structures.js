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

    function questionDo() {
        if (f.stack.peek(1) !== f.stack.peek(2)) {
            _do();
        } else {
            f.stack.pop();
            f.stack.pop();
            f.instructionPointer = f.dataSpace[f.instructionPointer];
        }
    }

    f.defjs("?do", function compileQuestionDo() {
        f.dataSpace.push(questionDo);
        f.dataSpace.push(0); // Dummy endLoop
        f.stack.push(f.dataSpace.length - 1);
    }, true); // Immediate

    function plusLoop() {
        var step = f.stack.pop();
        var index = f.returnStack.pop() | 0;
        var limit = f.returnStack.pop() | 0;

        var exitLoop;
        if (step > 0) {
            if (index > limit) { // Overflow, so do unsigned
                limit = limit >>> 0;
                index = index >>> 0;
            }
            exitLoop = index < limit && index + step >= limit;
        } else if (step < 0) {
            if (index < limit) {
                index = index >>> 0;
                limit = limit >>> 0;
            }
            exitLoop = index >= limit && index + step < limit;
        } else {
            exitLoop = false;
        }

        if (exitLoop) {
            f.returnStack.pop();
            f.instructionPointer++;
        } else {
            f.returnStack.push(limit | 0);
            f.returnStack.push(index + step | 0);
            f.instructionPointer += f.dataSpace[f.instructionPointer];
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