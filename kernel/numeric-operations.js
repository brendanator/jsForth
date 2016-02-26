var Long = require("long");

function NumericOperations(f) {
    f.defjs("+", function plus() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() + first | 0);
    });

    f.defjs("-", function minus() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() - first | 0);
    });

    f.defjs("*", function multiply() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() * first | 0);
    });

    f.defjs("/", function divide() {
        var first = f.stack.pop();
        var second = f.stack.pop();
        f.stack.push(Math.trunc(second / first));
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

    f.defjs("s>d", function singleToDouble() {
        var value = Long.fromInt(f.stack.pop());
        f.stack.push(value.low);
        f.stack.push(value.high);
    });

    f.defjs("*/", function multiplyDivide() {
        var divisor = Long.fromInt(f.stack.pop());
        var first = Long.fromInt(f.stack.pop());
        var second = Long.fromInt(f.stack.pop());
        var quotient = first.mul(second).div(divisor).toInt();
        f.stack.push(quotient);
    });

    f.defjs("m*", function() {
        var first = Long.fromInt(f.stack.pop());
        var second = Long.fromInt(f.stack.pop());
        var result = first.mul(second);
        f.stack.push(result.low);
        f.stack.push(result.high);
    });

    f.defjs("*/mod", function multiplyDivideMod() {
        var divisor = Long.fromInt(f.stack.pop());
        var first = Long.fromInt(f.stack.pop());
        var second = Long.fromInt(f.stack.pop());
        var mult = first.mul(second);
        var quotient = mult.div(divisor).toInt();
        var mod = mult.mod(divisor).toInt();
        f.stack.push(mod);
        f.stack.push(quotient);
    });

    f.defjs("um*", function() {
        var first = Long.fromInt(f.stack.pop(), true);
        var second = Long.fromInt(f.stack.pop(), true);
        var result = first.mul(second);
        f.stack.push(result.low);
        f.stack.push(result.high);
    });

    f.defjs("um/mod", function unsignedDivideMod() {
        var divisor = Long.fromInt(f.stack.pop());
        var bigPart = f.stack.pop();
        var smallPart = f.stack.pop();
        var long = new Long(smallPart, bigPart, true);
        var quotient = long.div(divisor).toInt();
        var mod = long.mod(divisor).toInt();
        f.stack.push(mod);
        f.stack.push(quotient);
    });

    f.defjs("fm/mod", function flooredDivideMod() {
        var divisor = Long.fromInt(f.stack.pop());
        var bigPart = f.stack.pop();
        var smallPart = f.stack.pop();
        var long = new Long(smallPart, bigPart);
        var quotient = long.div(divisor).toInt();
        var mod = long.mod(divisor).toInt();
        f.stack.push(mod);
        f.stack.push(quotient);
    });

    f.defjs("sm/rem", function symmetricDivideRem() {
        var divisor = Long.fromInt(f.stack.pop());
        var bigPart = f.stack.pop();
        var smallPart = f.stack.pop();
        var long = new Long(smallPart, bigPart);
        var quotient = long.div(divisor).toInt();
        var mod = long.mod(divisor).toInt();
        f.stack.push(mod);
        f.stack.push(quotient);
    });

    f.defjs("abs", function abs() {
        f.stack.push(Math.abs(f.stack.pop()) | 0);
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