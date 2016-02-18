function ComparisonOperations(f) {
    f.defjs("true", function _true() {
        f.stack.push(true);
    });

    f.defjs("false", function _false() {
        f.stack.push(false);
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
        f.stack.push(f.stack.pop() == first);
    });

    f.defjs("<>", function notEqual() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() != first);
    });

    f.defjs("<", function lessThan() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() < first);
    });

    f.defjs(">", function greaterThan() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() > first);
    });

    f.defjs("<=", function lessThanEqual() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() <= first);
    });

    f.defjs(">=", function greaterThanEqual() {
        var first = f.stack.pop();
        f.stack.push(f.stack.pop() >= first);
    });

    return f;
}

module.exports = ComparisonOperations;