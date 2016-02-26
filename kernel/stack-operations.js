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

    f.defjs("pick", function pick() {
        f.stack.push(f.stack.peek(f.stack.pop() + 1));
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

    f.defjs("roll", function roll() {
        var num = f.stack.pop();
        f.stack.roll(num);
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