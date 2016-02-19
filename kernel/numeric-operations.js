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