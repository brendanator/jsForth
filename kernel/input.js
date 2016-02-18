var EndOfInput = (function() {})();

function Input(input, startPosition, endPosition, toIn) {
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
      return Input(input, position, position + length, toIn);
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

module.exports = Input;
module.EndOfInput = EndOfInput;