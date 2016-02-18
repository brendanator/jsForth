function ComparisonOperations(f) {
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