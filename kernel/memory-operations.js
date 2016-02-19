function MemoryOperations(f) {
    function getAddress(address) {
        if (address < 0) {
            return f._currentInput.charCodeAt(address - f._INPUT_SOURCE);
        } else {
            var value = f.dataSpace[address];
            if (typeof value == "string")
                return value.charCodeAt(0);
            else
                return value;
        }
    }

    function setAddress(address, value) {
        if (address < 0) {
            throw "Illegal attempt to change input";
        } else {
            f.dataSpace[address] = value;
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
        f.dataSpace[address] = f.dataSpace[address] + data;
    });

    f.defjs("-!", function subtractStore() {
        var address = f.stack.pop();
        var data = f.stack.pop();
        f.dataSpace[address] = f.dataSpace[address] - data;
    });

    f.defjs("here", function here() {
        f.stack.push(f.dataSpace.length);
    });

    f._getAddress = getAddress;
    f._setAddress = setAddress;
    return f;
}

module.exports = MemoryOperations;