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

    f.defjs(".s", function dotS() {
        for (var i = 1; i <= f.stack.length(); i++) {
            var top = f.stack.peek(i);
            var value;

            if (typeof top === "undefined")
                value = "undefined";
            else if (top === null)
                value = "null";
            else
                value = top.toString(f._base()); // Output numbers in current base

            f._output += value + "\n";
        }
    });

    f.defjs(".r", function dotR() {
        var value;
        var width = f.stack.pop();
        var top = f.stack.pop();

        if (typeof top === "undefined")
            value = "undefined";
        else if (top === null)
            value = "null";
        else
            value = top.toString(f._base()); // Output numbers in current base

        while (value.length < width) {
            value = " " + value;
        }
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
        var bigPart = f.stack.pop();
        var smallPart = f.stack.pop();
        var value = new Long(smallPart, bigPart, true);
        var base = Long.fromInt(f._base());

        numericOutput += value.mod(base).toString(base).toUpperCase();
        value = value.div(base);

        f.stack.push(value.smallPart);
        f.stack.push(value.bigPart);
    });

    f.defjs("#S", function writeAllNumericOutput() {
        var bigPart = f.stack.pop();
        var smallPart = f.stack.pop();
        var value = new Long(smallPart, bigPart, true);
        var base = Long.fromInt(f._base());

        if (value.compare(Long.ZERO)) {
            while (value.compare(Long.ZERO)) {
                numericOutput += value.mod(base).toString(base).toUpperCase();
                value = value.div(base);
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
        var bigPart = f.stack.pop();
        var smallPart = f.stack.pop();
        var value = new Long(smallPart, bigPart, true);
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
