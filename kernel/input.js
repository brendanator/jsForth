var InputExceptions = require("./input-exceptions.js");

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
        var keyPosition = inputBufferPosition + toIn();
        if (keyPosition < endPosition) {
            toIn(toIn() + 1);
            return input.charAt(keyPosition);
        } else {
            return null;
        }
    }

    function parse(delimiter, skipLeading) {
        delimiter = delimiter || " ".charCodeAt(0);
        var inputBuf = inputBuffer();

        var startPosition = toIn();
        if (skipLeading) {
            while (inputBuf.charCodeAt(startPosition) === delimiter && startPosition < inputBuf.length) {
                startPosition++;
            }
        }

        var endPosition = startPosition + 1;
        while (inputBuf.charCodeAt(endPosition) !== delimiter && endPosition < inputBuf.length) {
            endPosition++;
        }

        toIn(endPosition + 1);
        var result = inputBuf.substring(startPosition, endPosition);
        return [inputBufferPosition + startPosition, result.length, result];
    }

    function readWord(delimiter) {
        return parse(delimiter, true)[2];
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
    }

    var wordBufferStart = f.dataSpace.length;
    f.dataSpace.length += 128;
    f.defjs("word", function word() {
        var delimiter = f.stack.pop();
        var word = readWord(delimiter);
        var length = Math.min(word.length, 127);
        f.dataSpace[wordBufferStart] = length;
        for (var i = 0; i < length; i++) {
            f.dataSpace[wordBufferStart + i + 1] = word.charCodeAt(i);
        }

        f.stack.push(wordBufferStart);
    });

    f.defjs("char", function char() {
        f.stack.push(readWord().charCodeAt(0));
    });

    f.defjs("accept", function accept() {

        var maxLength = f.stack.pop();
        var address = f.stack.pop();

        f.currentInstruction = function acceptCallback() {
            var received = f._currentInput.inputBuffer().substring(0, maxLength).split("\n")[0];

            f.stack.push(received.length);
            for (var i = 0; i < received.length; i++) {
                f._setAddress(address + i, received[i]);
            }

            popInput();
        };

        throw InputExceptions.WaitingOnInput;
    });

    // returns NaN if any characters are invalid in base
    function parseIntStrict(num, base) {
        var int = 0;
        if (num[0] !== "-") { // Positive
            for (var i = 0; i < num.length; i++) {
                int *= base;
                int += parseInt(num[i], base);
            }
            return int;
        } else {
            for (var j = 1; j < num.length; j++) {
                int *= base;
                int -= parseInt(num[j], base);
            }
            return int;
        }
    }

    // Parse a float in the current base
    function _parseFloatInBase(string) {
        var base;
        if (string[0] === "'" && string.length === 3 && string[2] == "'") { // 'a'
            return string.charCodeAt(1);
        } else if (string[0] === "#") { // decimal - #1234567890
            string = string.substring(1);
            base = 10;
        } else if (string[0] === "$") { // hex - $ff00ff
            string = string.substring(1);
            base = 16;
        } else if (string[0] === "%") { // binary - %10110110
            string = string.substring(1);
            base = 2;
        } else {
            base = f._base();
        }

        var num = string.split(/\./);

        var integerPart = 0;
        if (num[0] !== '') {
            integerPart = parseIntStrict(num[0], base);
        }

        var fractionalPart = 0;
        if (num.length > 1 && num[1] !== '') {
            fractionalPart = parseIntStrict(num[1], base) * Math.pow(base, -num[1].length);
        }

        if (integerPart >= 0) {
            return integerPart + fractionalPart;
        } else {
            return integerPart - fractionalPart;
        }
    }

    var inputString = "";

    function newInput(input) {
        saveCurrentInput();
        var startPosition = inputString.length;
        inputString += input;
        f._currentInput = InputWindow(inputString, startPosition, inputString.length, toIn);
    }

    var inputStack = [];

    function subInput(position, length) {
        saveCurrentInput();
        f._currentInput = f._currentInput.subInput(position, length);
    }

    function saveCurrentInput() {
        if (f._currentInput) {
            inputStack.push({
                input: f._currentInput,
                toIn: toIn(),
                instructionPointer: f.instructionPointer
            });
        }
    }

    function popInput() {
        var savedInput = inputStack.pop();
        if (savedInput) {
            f._currentInput = savedInput.input;
            toIn(savedInput.toIn);
            f.instructionPointer = savedInput.instructionPointer;
            f.currentInstruction = f.dataSpace[f.instructionPointer++];
        } else {
            f._currentInput = null;
        }
    }

    f._readWord = readWord;
    f._newInput = newInput;
    f._subInput = subInput;
    f._popInput = popInput;
    f._parseFloatInBase = _parseFloatInBase;
    f._INPUT_SOURCE = INPUT_SOURCE;
    return f;
}

module.exports = Input;