var EndOfInput = (function() {})();

function InputWindow(input, startPosition, endPosition, toIn) {
    var inputBufferPosition = startPosition;
    var inputBufferLength = -1;
    refill();

    function refill() {
        inputBufferPosition += inputBufferLength + 1;

        inputBufferLength = input.substring(inputBufferPosition).search(/\n/);
        if (inputBufferLength == -1 || inputBufferPosition + inputBufferLength > endPosition)
            inputBufferLength = endPosition - inputBufferPosition;

        toIn(0);
        return inputBufferPosition < endPosition;
    }

    function readKey() {
        if (toIn() > inputBufferLength) {
            if (!refill()) throw EndOfInput;
        }

        var keyPosition = inputBufferPosition + toIn();
        toIn(toIn() + 1);
        if (keyPosition < endPosition) {
            return input.charAt(keyPosition);
        } else {
            return " ";
        }
    }

    function parse(delimiter) {
        if (typeof delimiter === "number") delimiter = String.fromCharCode(delimiter);
        var address = inputBufferPosition + toIn();
        var length = 0;
        var result = "";
        if (toIn() <= inputBufferLength) {
            var key = readKey();
            while (key !== delimiter) {
                length++;
                result += key;
                key = readKey();
            }
        } else {
            refill();
        }
        return [address, length, result];
    }

    function readWord(delimiter) {
        if (toIn() >= inputBufferLength) {
            refill();
        }
        delimiter = delimiter || /\s/;

        var word = "";
        var key = readKey();

        // Skip leading delimiters
        while (key.match(delimiter))
            key = readKey();

        while (!key.match(delimiter) && toIn() <= inputBufferLength) {
            word += key;
            key = readKey();
        }

        return word;
    }

    function source() {
        return [inputBufferPosition, inputBufferLength];
    }

    function inputBuffer() {
        return input.substring(inputBufferPosition, inputBufferPosition + inputBufferLength);
    }

    function subInput(position, length) {
        return InputWindow(input, position, position + length, toIn);
    }

    function charCodeAt(index) {
        return input.charCodeAt(index);
    }

    return {
        readWord: readWord,
        readKey: readKey,
        parse: parse,
        refill: refill,
        inputBuffer: inputBuffer,
        source: source,
        charCodeAt: charCodeAt,
        subInput: subInput
    };
}

function Input(f) {
    f._base = f.defvar("base", 10);

    // Input buffer pointer
    var toIn = f.defvar(">in", 0);

    // Address offset to indicate input addresses 
    var INPUT_SOURCE = 1 << 31;

    f.defjs("source", function source() {
        var positionLength = f._currentInput.source();
        f.stack.push(INPUT_SOURCE + positionLength[0]);
        f.stack.push(positionLength[1]);
    });

    f.defjs("refill", function refill() {
        f.stack.push(f._currentInput.refill());
    });

    f.defjs("key", function key() {
        f.stack.push(f._currentInput.readKey().charCodeAt(0));
    });

    f.defjs("parse", function parse() {
        var addressLength = f._currentInput.parse(f.stack.pop());
        f.stack.push(INPUT_SOURCE + addressLength[0]);
        f.stack.push(addressLength[1]);
    });

    function readWord(delimiter) {
        return f._currentInput.readWord(delimiter);
    };

    var wordBufferStart = f.dataSpace.length;
    f.dataSpace.length += 32;
    f.defjs("word", function word() {
        var delimiter = f.stack.pop();
        if (typeof delimiter === "number") delimiter = String.fromCharCode(delimiter);
        f.stack.push(wordBufferStart);

        var word = readWord(delimiter);
        var length = Math.min(word.length, 31);
        f.dataSpace[wordBufferStart] = length;
        for (var i = 0; i < length; i++) {
            f.dataSpace[wordBufferStart + i + 1] = word.charCodeAt(i);
        }
    });

    f.defjs("char", function char() {
        f.stack.push(readWord().charCodeAt(0));
    });

    f.defjs("accept", function accept() {
        var savedInput = f._currentInput;
        var savedToIn = toIn();

        var maxLength = f.stack.pop();
        var address = f.stack.pop();

        f.currentInstruction = function acceptCallback() {
            var received = f._currentInput.inputBuffer().substring(0, maxLength).split("\n")[0];

            f.stack.push(received.length);
            for (var i = 0; i < received.length; i++) {
                f._setAddress(address + i, received[i]);
            }

            f._currentInput = savedInput;
            toIn(savedToIn);
        };

        throw Input.EndOfInput;
    });

    function _parseInt(string, base) {
        var int = 0;
        if (string[0] !== "-") { // Positive
            for (var i = 0; i < string.length; i++) {
                int *= base;
                int += parseInt(string[i], base);
            }
            return int;
        } else {
            for (var j = 1; j < string.length; j++) {
                int *= base;
                int -= parseInt(string[j], base);
            }
            return int;
        }
    }

    // Parse a float in the provide base
    function _parseFloat(string) {
        var base = f._base();

        //split the string at the decimal point
        string = string.split(/\./);

        //if there is nothing before the decimal point, make it 0
        if (string[0] === '') {
            string[0] = "0";
        }

        //if there was a decimal point & something after it
        if (string.length > 1 && string[1] !== '') {
            var fractionLength = string[1].length;
            string[1] = _parseInt(string[1], base);
            string[1] *= Math.pow(base, -fractionLength);
            var int = _parseInt(string[0], base);
            if (int >= 0)
                return int + string[1];
            else
                return int - string[1];
        }

        //if there wasn't a decimal point or there was but nothing was after it
        return _parseInt(string[0], base);
    }

    var inputString = "";

    function newInput(input) {
        var startPosition = inputString.length;
        inputString += input;
        f._currentInput = InputWindow(inputString, startPosition, inputString.length, toIn);
    }

    var inputStack = [];

    function subInput(position, length) {
        inputStack.push({
            input: f._currentInput,
            toIn: toIn()
        });
        f._currentInput = f._currentInput.subInput(position, length);
    }

    function popInput() {
        var savedInput = inputStack.pop();
        f._currentInput = savedInput.input;
        toIn(savedInput.toIn);
    }

    f._readWord = readWord;
    f._newInput = newInput;
    f._subInput = subInput;
    f._popInput = popInput;
    f._parseFloat = _parseFloat;
    f._INPUT_SOURCE = INPUT_SOURCE;
    return f;
}

module.exports = Input;
module.EndOfInput = EndOfInput;