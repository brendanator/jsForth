function ComparisonOperations(f) {
    f.defjs("true", function _true() {
        f.stack.push(-1);
    });

    f.defjs("false", function _false() {
        f.stack.push(0);
    });

    f.defjs("and", function and() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() & first);
    });

    f.defjs("or", function or() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() | first);
    });

    f.defjs("xor", function xor() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() ^ first);
    });

    f.defjs("invert", function invert() {
        f.stack.push(~f.stack.pop());
    });

    f.defjs("=", function equal() {
        var first = f.stack.pop();
        f.stack.push((f.stack.pop() == first) ? -1 : 0);
    });

    f.defjs("<>", function notEqual() {
        var first = f.stack.pop();
        f.stack.push((f.stack.pop() != first) ? -1 : 0);
    });

    f.defjs("<", function lessThan() {
        var first = f.stack.pop();
        f.stack.push((f.stack.pop() < first) ? -1 : 0);
    });

    f.defjs(">", function greaterThan() {
        var first = f.stack.pop();
        f.stack.push((f.stack.pop() > first) ? -1 : 0);
    });

    f.defjs("<=", function lessThanEqual() {
        var first = f.stack.pop();
        f.stack.push((f.stack.pop() <= first) ? -1 : 0);
    });

    f.defjs(">=", function greaterThanEqual() {
        var first = f.stack.pop();
        f.stack.push((f.stack.pop() >= first) ? -1 : 0);
    });

    f.defjs("within", function within() {
        var upperLimit = f.stack.pop();
        var lowerLimit = f.stack.pop();
        var value = f.stack.pop();
        var result = (lowerLimit < upperLimit && lowerLimit <= value && value < upperLimit ||
            lowerLimit > upperLimit && (lowerLimit <= value || value < upperLimit));
        f.stack.push(result ? -1 : 0);
    });

    return f;
}

module.exports = ComparisonOperations;