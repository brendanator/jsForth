function MemoryOperations(f) {
    function getAddress(address) {
        if (address < 0) {
            return f._currentInput.charCodeAt(address - f._INPUT_SOURCE);
        } else {
            return f.wordDefinitions[address];
        }
    }

    function setAddress(address, value) {
        if (address < 0) {
            throw "Illegal attempt to change input";
        } else {
            f.wordDefinitions[address] = value;
        }
    }

    f.defjs("!", function store() {
        var address = f.stack.pop();
        var data = f.stack.pop();
        setAddress(address, data);
    });

    f.defjs("@", function fetch() {
        var address = f.stack.pop();
        f.stack.push(getAddress(address));
    });

    f.defjs("+!", function addStore() {
        var address = f.stack.pop();
        var data = f.stack.pop();
        f.wordDefinitions[address] = f.wordDefinitions[address] + data;
    });

    f.defjs("-!", function subtractStore() {
        var address = f.stack.pop();
        var data = f.stack.pop();
        f.wordDefinitions[address] = f.wordDefinitions[address] - data;
    });

    f.defjs("here", function here() {
        f.stack.push(f.wordDefinitions.length);
    });

    f._getAddress = getAddress;
    f._setAddress = setAddress;
    return f;
}

module.exports = MemoryOperations;