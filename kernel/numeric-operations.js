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

    return f;
}

module.exports = NumericOperations;