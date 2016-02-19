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

    f.defjs("unsigned", function unsigned() {
        f.stack.push(f.stack.pop() >>> 0);
    });

    // Numeric output
    var numericOutputStart = f.wordDefinitions.length;
    var numericOutput = "";
    f.wordDefinitions.length += 128;

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
            f.wordDefinitions[numericOutputStart + i] = numericOutput[numericOutput.length - i - 1];
        }
        f.stack.push(numericOutputStart);
        f.stack.push(numericOutput.length);
    });

    f.defjs("sign", function sign() {
        if (f.stack.pop() < 0)
            numericOutput += "-";
    });

    var maxUInt = Math.pow(2, 32);
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

module.exports = NumericOperations;