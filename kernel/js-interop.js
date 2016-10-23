function JsInterop(f) {
    // Interop
    //   - new with params          js .new{1}
    //   - global variable access   js /document
    //   - array access             js .0.2
    //   - property access/setting  js .name  js .name!
    //   - function calling         js .sin{1} .{2}  >>  obj = pop, f = obj[name], f.call(obj, pop(), pop())
    //   - method calling           js /document.getElementById{1}
    //
    // When compiling it should resolve global names immediately.
    function jsNewCall(path) {
        var constructor = f.stack.pop();
        var argsCount = parseInt(path.match(/\{(\d*)\}/)[1] || 0);
        var args = [null]; // new replaces the first argument with this
        for (var j = 0; j < argsCount; j++) {
            args.push(f.stack.pop());
        }
        // Use new operator with any number of arguments
        return new(Function.prototype.bind.apply(constructor, args))();
    }

    function jsFunctionCall(path) {
        var argsCount = parseInt(path.match(/\{(\d*)\}/)[1] || 0);
        var obj = f.stack.pop();
        path = path.match(/[^\{]*/)[0];
        var func = path ? obj[path] : obj;
        var args = [];
        for (var j = 0; j < argsCount; j++) {
            args.push(f.stack.pop());
        }
        return func.apply(obj, args);
    }

    var jsAssignmentRegex = /(^[A-Za-z$_][\w$_]*!$)|(^\d+!$)/; // name!
    var jsNewCallRegex = /new\{\d*\}$/; // new{2}
    var jsFunctionCallRegex = /((^[A-Za-z$_][\w$_]*)|(^\d+))?\{\d*\}$/; // getElementById{1}

    var globl = (typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document) ? window : global;

    function jsInterop(js) {
        if (js.startsWith("/")) { // Add global to f.stack
            f.stack.push(globl);
        } else if (!js.startsWith(".")) {
            throw "js interop call must start with '/' or '.'";
        }

        var paths = js.length > 1 ? js.substring(1).split(".") : [];

        for (var i = 0; i < paths.length; i++) {
            var path = paths[i];

            if (path.match(jsAssignmentRegex)) {
                f.stack.pop()[path.substring(0, path.length - 1)] = f.stack.pop();
            } else if (path.match(jsNewCallRegex)) {
                f.stack.push(jsNewCall(path));
            } else if (path.match(jsFunctionCallRegex)) {
                f.stack.push(jsFunctionCall(path));
            } else { // Property access
                f.stack.push(f.stack.pop()[path]);
            }
        }
    }

    var JS = f.defjs("js", function js() {
        jsInterop(f.stack.pop());
    });

    f.defjs("js", function js() {
        if (f.compiling()) {
            f.dataSpace.push(f._lit);
            f.dataSpace.push(f._readWord());
            f.dataSpace.push(JS);
        } else {
            jsInterop(f._readWord());
        }
    }, true);

    f.defjs(">js-string", function toJsString() {
        var length = f.stack.pop();
        var address = f.stack.pop();
        var string = "";
        for (var i = 0; i < length; i++) {
            string += String.fromCharCode(f._getAddress(address + i));
        }
        f.stack.push(string);
    })

    return f;
}

module.exports = JsInterop;
