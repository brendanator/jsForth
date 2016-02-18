function ControlStructures(f) {
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

    f.defjs("recurse", function recurse() {
        f.wordDefinitions.push(f.wordDefinitions[f._latest() + 1]);
    }, true); // Immediate

    return f;
}

module.exports = ControlStructures;