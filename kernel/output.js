var Long = require("long");

function Output(f) {

    f._output = "";

    f.defjs("cr", function cr() {
        f._output += "\n";
    });

    f.defjs(".", function dot() {
        var value;
        var top = f.stack.pop();

        if (typeof top === "undefined")
            value = "undefined";
        else if (top === null)
            value = "null";
        else
            value = top.toString(f._base()); // Output numbers in current base

        f._output += value + " ";
    });

    f.defjs("emit", function emit() {
        var value = f.stack.pop();
        if (typeof value === "number")
            f._output += String.fromCharCode(value);
        else
            f._output += value;
    });

    f.defjs("type", function type() {
        var length = f.stack.pop();
        var address = f.stack.pop();
        for (var i = 0; i < length; i++) {
            var value = f._getAddress(address + i);
            if (typeof value === "number") {
                f._output += String.fromCharCode(value);
            } else
                f._output += value;
        }
    });

    // Numeric output
    var maxUInt = Math.pow(2, 32);

    var numericOutputStart = f.dataSpace.length;
    var numericOutput = "";
    f.dataSpace.length += 128;

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
            f.dataSpace[numericOutputStart + i] = numericOutput[numericOutput.length - i - 1];
        }
        f.stack.push(numericOutputStart);
        f.stack.push(numericOutput.length);
    });

    f.defjs("sign", function sign() {
        if (f.stack.pop() < 0)
            numericOutput += "-";
    });

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
        var base = Long.fromInt(f._base());
        var length = f.stack.pop();
        var address = f.stack.pop();
        var bigPart = f.stack.pop() >>> 0;
        var smallPart = f.stack.pop() >>> 0;
        var value = new Long(smallPart, bigPart);
        var unconverted = length;

        for (var i = 0; i < length; i++) {
            var next = parseInt(String.fromCharCode(f._getAddress(address)), base);

            if (isNaN(next)) {
                break;
            } else {
                address++;
                unconverted--;
                value = value.mul(base).add(Long.fromInt(next));
            }
        }

        f.stack.push(value.low);
        f.stack.push(value.high);
        f.stack.push(address);
        f.stack.push(unconverted);
    });

    return f;
}

module.exports = Output;