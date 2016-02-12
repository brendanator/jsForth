function Forth(global) {
    "use strict";

    var instructionPointer;

    var wordDefinitions = [];

    var returnStack = [];

    var stack = [];

    var latest = (function() {
        var val = null;
        return function(value) {
            if (value !== undefined)
                val = value;
            else
                return val;
        };
    })();

    function Header(link, name, immediate, hidden, executionToken) {
        this.link = link;
        this.name = name;
        this.immediate = immediate || false;
        this.hidden = hidden || false;
        this.executionToken = executionToken;
    }

    function defheader(name, immediate, hidden) {
        wordDefinitions.push(new Header(latest(), name, immediate, hidden, wordDefinitions.length + 1));
        latest(wordDefinitions.length - 1);
    }

    function defjs(name, f, immediate) {
        defheader(name, immediate);
        wordDefinitions.push(f);
        return f;
    }

    function compileEnter() {
        var instruction = wordDefinitions.length + 1;

        function enter() {
            returnStack.push(instructionPointer);
            instructionPointer = instruction;
        }
        wordDefinitions.push(enter);
        return enter;
    }

    defjs("exit", function exit() {
        instructionPointer = returnStack.pop();
    });

    function findDefinition(word) {
        var current = latest();
        while (current !== null) {
            var wordDefinition = wordDefinitions[current];
            // Case insensitive
            if (wordDefinition.name.toLowerCase() == word.toLowerCase() && !wordDefinition.hidden)
                return wordDefinition;
            current = wordDefinition.link;
        }
        return current;
    }
    defjs("find", function find() {
        var word = stack.pop();
        var definition = findDefinition(word);
        if (definition) {
            stack.push(definition.executionToken);
            stack.push(definition.immediate ? 1 : -1);
        } else {
            stack.push(word);
            stack.push(0);
        }
    });

    function defvar(name, initial) {
        defheader(name);
        var varAddress = wordDefinitions.length + 1;
        wordDefinitions.push(function variable() {
            stack.push(varAddress);
        });
        wordDefinitions.push(initial);

        return function(value) {
            if (value !== undefined)
                wordDefinitions[varAddress] = value;
            else
                return wordDefinitions[varAddress];
        };
    }

    var compiling = defvar("state", 0);
    latest = defvar("latest", wordDefinitions.length); // Replace existing function definition
    var base = defvar("base", 10);
    var toIn = defvar(">in", 0);

    defjs("here", function here() {
        stack.push(wordDefinitions.length);
    });

    var LIT = defjs("lit", function lit() {
        stack.push(wordDefinitions[instructionPointer]);
        instructionPointer += 1;
    });

    var input = "";
    var SOURCE = 1 << 31;
    var inputBufferPosition = 0;
    var inputBufferLength = -1;
    var EndOfInput = (function() {})();

    defjs("source", function source() {
        stack.push(inputBufferPosition + SOURCE);
        stack.push(inputBufferLength);
    });

    function _refill() {
        inputBufferPosition += inputBufferLength + 1;
        inputBufferLength = input.substring(inputBufferPosition).search(/\n/);
        toIn(0);
        return inputBufferLength >= 0;
        // if (input) {
        //     toIn(0);
        //     inputBuffer = "";
        //     while (input && !inputBuffer) {
        //         var newLineIndex = input.search(/\n/);
        //         if (newLineIndex >= 0) {
        //             inputBuffer = input.substring(0, newLineIndex);
        //             input = input.substring(newLineIndex + 1);
        //         } else {
        //             inputBuffer = input;
        //             input = "";
        //         }
        //     }
        //     return true;
        // } else
        //     return false;
    }
    defjs("refill", function refill() {
        stack.push(_refill());
    });

    function readKey() {
        if (toIn() > inputBufferLength) {
            if (!_refill()) throw EndOfInput;
        }

        var key = input.charCodeAt(inputBufferPosition + toIn());
        toIn(toIn() + 1);
        return key;

        // if (toIn() >= inputBuffer.length) {
        //     if (_refill())
        //         return "\n";
        //     else
        //         throw EndOfInput;
        // } else {
        //     var key = inputBuffer.charAt(toIn());
        //     toIn(toIn() + 1);
        //     return key;
        // }
    }
    defjs("key", function key() {
        stack.push(readKey());
    });

    function readWord() {
        var word = "";
        var key;
        while (true) {
            key = String.fromCharCode(readKey());
            if (!key.match(/\s/))
                break;
        }

        while (!key.match(/\s/)) {
            word += key;
            key = String.fromCharCode(readKey());
        }

        return word;
    }
    defjs("word", function word() {
        stack.push(readWord());
    });

    function _parse(delimiter) {
        if (typeof delimiter === "string") delimiter = delimiter.charCodeAt(0);
        var address = SOURCE + inputBufferPosition + toIn();
        var length = 0;
        var key = readKey();
        while (key !== delimiter) {
            length++;
            key = readKey();
        }
        return [address, length];
    }
    defjs("parse", function parse() {
        var addressLength = _parse(stack.pop());
        stack.push(addressLength[0]);
        stack.push(addressLength[1]);
    });

    defjs("char", function char() {
        stack.push(readWord().charCodeAt(0));
    });

    var output = "";

    defjs("cr", function cr() {
        output += "\n";
    });

    defjs(".", function dot() {
        var value;
        if (stack.length) {
            var top = stack.pop();

            if (typeof top === "undefined")
                value = "undefined";
            else if (top === null)
                value = "null";
            else
                value = top.toString(base()); // Output numbers in current base
        } else
            value = "Stack empty";

        output += value + " ";
    });

    defjs("emit", function emit() {
        var value = stack.pop();
        if (typeof value === "number")
            output += String.fromCharCode(value);
        else
            output += value;

    });

    defjs("type", function type() {
        var length = stack.pop();
        var address = stack.pop();
        for (var i = 0; i < length; i++) {
            var value = getAddress(address + i);
            if (typeof value === "number")
                output += String.fromCharCode(value);
            else
                output += value;
        }
    });

    function _parseInt(string, base) {
        if (string[0] !== "-") { // Positive
            var int = 0;
            for (var i = 0; i < string.length; i++) {
                int *= base;
                int += parseInt(string[i], base);
            }
            return int;
        } else {
            var int = 0;
            for (var i = 1; i < string.length; i++) {
                int *= base;
                int -= parseInt(string[i], base);
            }
            return int;
        }
    }

    // Parse a float in the provide base
    function parseFloat(string, base) {
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

    defjs("interpret", function interpret() {
        var word = readWord();
        var definition = findDefinition(word);
        if (definition) {
            if (!compiling() || definition.immediate) {
                wordDefinitions[definition.executionToken]();
                return;
            } else {
                wordDefinitions.push(wordDefinitions[definition.executionToken]);
            }
        } else {
            var num = parseFloat(word, base());
            if (isNaN(num)) throw "Word not defined: " + word;
            if (compiling()) {
                wordDefinitions.push(LIT);
                wordDefinitions.push(num);
            } else {
                stack.push(num);
            }
        }
    });

    // Converts an execution token into the data field address
    defjs(">body", function dataFieldAddress() {
        stack[stack.length - 1] = stack[stack.length - 1] + 1;
    });

    defjs("create", function create() {
        defheader(readWord(), false, false);
        var dataFieldAddress = wordDefinitions.length + 1;
        wordDefinitions.push(function pushDataFieldAddress() {
            stack.push(dataFieldAddress);
        });
    });

    defjs("allot", function allot() {
        wordDefinitions.length += stack.pop();
    });

    defjs(",", function comma() {
        wordDefinitions.push(stack.pop());
    });

    defjs("compile,", function compileComma() {
        wordDefinitions.push(wordDefinitions[stack.pop()]);
    });

    defjs("[", function lbrac() {
        compiling(false); // Immediate
    }, true); // Immediate

    defjs("]", function rbrac() {
        compiling(true); // Compile
    });

    defjs("immediate", function immediate() {
        var wordDefinition = wordDefinitions[latest()];
        wordDefinition.immediate = !wordDefinition.immediate;
    }, true); // Immediate

    defjs("hidden", function hidden() {
        var wordDefinition = wordDefinitions[stack.pop()];
        wordDefinition.hidden = !wordDefinition.hidden;
    });

    function getAddress(address) {
        if (address < 0) {
            return input.charCodeAt(address - SOURCE);
        } else {
            return wordDefinitions[address];
        }
    }

    function setAddress(address, value) {
        if (address < 0) {
            // TODO ?
            throw "Changing SOURCE";
        } else {
            wordDefinitions[address] = value;
        }
    }

    defjs("!", function store() {
        var address = stack.pop();
        var data = stack.pop();
        setAddress(address, data);
    });

    defjs("@", function fetch() {
        var address = stack.pop();
        stack.push(getAddress(address));
    });

    defjs("+!", function addStore() {
        var address = stack.pop();
        var data = stack.pop();
        wordDefinitions[address] = wordDefinitions[address] + data;
    });

    defjs("-!", function subtractStore() {
        var address = stack.pop();
        var data = stack.pop();
        wordDefinitions[address] = wordDefinitions[address] - data;
    });

    defjs("'", function tick() {
        stack.push(findDefinition(readWord()).executionToken);
    });

    defjs("[']", function bracketTick() {
        wordDefinitions.push(LIT);
        wordDefinitions.push(findDefinition(readWord()).executionToken);
    }, true);

    defjs("jump", function jump() {
        instructionPointer += wordDefinitions[instructionPointer];
    });

    defjs("jumpIfFalse", function jumpIfFalse() {
        if (!stack.pop()) {
            instructionPointer += wordDefinitions[instructionPointer];
        } else {
            instructionPointer++; // Skip the offset
        }
    });

    defjs("execute", function execute() {
        wordDefinitions[stack.pop()]();
    });

    // Stack operations
    defjs("drop", function drop() {
        stack.pop();
    });

    defjs("swap", function swap() {
        var first = stack[stack.length - 1];
        stack[stack.length - 1] = stack[stack.length - 2];
        stack[stack.length - 2] = first;
    });

    defjs("dup", function dup() {
        stack[stack.length] = stack[stack.length - 1];
    });

    defjs("over", function over() {
        stack[stack.length] = stack[stack.length - 2];
    });

    defjs("rot", function rot() {
        var third = stack[stack.length - 3];
        stack[stack.length - 3] = stack[stack.length - 2];
        stack[stack.length - 2] = stack[stack.length - 1];
        stack[stack.length - 1] = third;
    });

    defjs("-rot", function backRot() {
        var first = stack[stack.length - 1];
        stack[stack.length - 1] = stack[stack.length - 2];
        stack[stack.length - 2] = stack[stack.length - 3];
        stack[stack.length - 3] = first;
    });

    defjs("2drop", function twoDrop() {
        stack.pop();
        stack.pop();
    });

    defjs("2dup", function twoDup() {
        stack[stack.length] = stack[stack.length - 2];
        stack[stack.length] = stack[stack.length - 2];
    });

    defjs("2over", function twoDup() {
        stack[stack.length] = stack[stack.length - 4];
        stack[stack.length] = stack[stack.length - 4];
    });

    defjs("2swap", function twoSwap() {
        var first = stack[stack.length - 1];
        var second = stack[stack.length - 2];
        stack[stack.length - 1] = stack[stack.length - 3];
        stack[stack.length - 2] = stack[stack.length - 4];
        stack[stack.length - 3] = first;
        stack[stack.length - 4] = second;
    });

    defjs("?dup", function nonZeroDup() {
        var first = stack[stack.length - 1];
        if (first !== 0) stack[stack.length] = first;
    });

    defjs("depth", function depth() {
        stack.push(stack.length);
    });

    defjs("negate", function negate() {
        stack.push(-stack.pop());
    });

    defjs("1+", function inc() {
        stack[stack.length - 1] = stack[stack.length - 1] + 1;
    });

    defjs("1-", function dec() {
        stack[stack.length - 1] = stack[stack.length - 1] - 1;
    });

    defjs("2*", function inc() {
        stack[stack.length - 1] = stack[stack.length - 1] << 1;
    });

    defjs("2/", function inc() {
        stack[stack.length - 1] = stack[stack.length - 1] >> 1;
    });

    defjs("4+", function inc4() {
        stack[stack.length - 1] = stack[stack.length - 1] + 4;
    });

    defjs("4-", function dec4() {
        stack[stack.length - 1] = stack[stack.length - 1] - 4;
    });

    defjs("+", function plus() {
        var first = stack.pop();
        stack[stack.length - 1] = stack[stack.length - 1] + first;
    });

    defjs("-", function minus() {
        var first = stack.pop();
        stack[stack.length - 1] = stack[stack.length - 1] - first;
    });

    defjs("*", function multiply() {
        var first = stack.pop();
        stack[stack.length - 1] = stack[stack.length - 1] * first;
    });

    defjs("/", function divide() {
        var first = stack.pop();
        stack[stack.length - 1] = stack[stack.length - 1] / first;
    });

    defjs("mod", function mod() {
        var first = stack.pop();
        stack[stack.length - 1] = stack[stack.length - 1] % first;
    });

    defjs("abs", function abs() {
        stack.push(Math.abs(stack.pop()));
    });

    defjs("lshift", function lshift() {
        var shift = stack.pop();
        var num = stack.pop();
        stack.push(num << shift);
    });

    defjs("rshift", function rshift() {
        var shift = stack.pop();
        var num = stack.pop();
        stack.push(num >>> shift);
    });

    defjs("max", function max() {
        stack.push(Math.max(stack.pop(), stack.pop()));
    });

    defjs("min", function min() {
        stack.push(Math.min(stack.pop(), stack.pop()));
    });


    defjs("=", function equal() {
        var first = stack.pop();
        stack[stack.length - 1] = stack[stack.length - 1] == first ? -1 : 0;
    });

    defjs("<>", function notEqual() {
        var first = stack.pop();
        stack[stack.length - 1] = stack[stack.length - 1] != first ? -1 : 0;
    });

    defjs("<", function lessThan() {
        var first = stack.pop();
        stack[stack.length - 1] = stack[stack.length - 1] < first ? -1 : 0;
    });

    defjs(">", function greaterThan() {
        var first = stack.pop();
        stack[stack.length - 1] = stack[stack.length - 1] > first ? -1 : 0;
    });

    defjs("<=", function lessThanEqual() {
        var first = stack.pop();
        stack[stack.length - 1] = stack[stack.length - 1] <= first ? -1 : 0;
    });

    defjs(">=", function greaterThanEqual() {
        var first = stack.pop();
        stack[stack.length - 1] = stack[stack.length - 1] >= first ? -1 : 0;
    });

    defjs("unsigned", function unsigned() {
        stack.push(stack.pop() >>> 0);
    });

    defjs("true", function _true() {
        stack.push(true);
    });

    defjs("false", function _false() {
        stack.push(false);
    });

    defjs("and", function and() {
        var first = stack.pop();
        stack[stack.length - 1] = stack[stack.length - 1] & first;
    });

    defjs("or", function or() {
        var first = stack.pop();
        stack[stack.length - 1] = stack[stack.length - 1] | first;
    });

    defjs("xor", function xor() {
        var first = stack.pop();
        stack[stack.length - 1] = stack[stack.length - 1] ^ first;
    });

    defjs("invert", function invert() {
        stack[stack.length - 1] = ~stack[stack.length - 1];
    });

    // Return stack
    defjs(">r", function toR() {
        returnStack.push(stack.pop());
    });

    defjs("r>", function rFrom() {
        stack.push(returnStack.pop());
    });

    defjs("r@", function rFetch() {
        stack.push(returnStack[returnStack.length - 1]);
    });

    defjs("2r>", function twoRFrom() {
        var top = returnStack.pop();
        stack.push(returnStack.pop());
        stack.push(top);
    });

    defjs("2>r", function twoToR() {
        var top = stack.pop();
        returnStack.push(stack.pop());
        returnStack.push(top);
    });

    defjs("2r@", function twoRFetch() {
        stack.push(returnStack[returnStack.length - 2]);
        stack.push(returnStack[returnStack.length - 1]);
    });

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
        var constructor = stack.pop();
        var argsCount = parseInt(path.match(/\{(\d*)\}/)[1] || 0);
        var args = [null]; // new replaces the first argument with this
        for (var j = 0; j < argsCount; j++) {
            args.push(stack.pop());
        }
        // Use new operator with any number of arguments
        return new(Function.prototype.bind.apply(constructor, args))();
    }

    function jsFunctionCall(path) {
        var argsCount = parseInt(path.match(/\{(\d*)\}/)[1] || 0);
        var obj = stack.pop();
        path = path.match(/[^\{]*/)[0];
        var func = path ? obj[path] : obj;
        var args = [];
        for (var j = 0; j < argsCount; j++) {
            args.push(stack.pop());
        }
        return func.apply(obj, args);
    }

    var jsAssignmentRegex = /(^[A-Za-z$_][\w$_]*!$)|(^\d+!$)/; // name!
    var jsNewCallRegex = /new\{\d*\}$/; // new{2}
    var jsFunctionCallRegex = /((^[A-Za-z$_][\w$_]*)|(^\d+))?\{\d*\}$/; // getElementById{1}

    function jsInterop(js) {
        if (js.startsWith("/")) { // Add global to stack
            stack.push(global);
        } else if (!js.startsWith(".")) {
            throw "js interop call must start with '/' or '.'";
        }

        var paths = js.length > 1 ? js.substring(1).split(".") : [];

        for (var i = 0; i < paths.length; i++) {
            var path = paths[i];

            if (path.match(jsAssignmentRegex)) {
                stack.pop()[path.substring(0, path.length - 1)] = stack.pop();
            } else if (path.match(jsNewCallRegex)) {
                stack.push(jsNewCall(path));
            } else if (path.match(jsFunctionCallRegex)) {
                stack.push(jsFunctionCall(path));
            } else { // Property access
                stack.push(stack.pop()[path]);
            }
        }
    }

    var JS = defjs("js", function js() {
        jsInterop(stack.pop());
    });

    defjs("js", function js() {
        if (compiling()) {
            wordDefinitions.push(LIT);
            wordDefinitions.push(readWord());
            wordDefinitions.push(JS);
        } else {
            jsInterop(readWord());
        }
    }, true);

    defjs("clearReturnStack", function clearReturnStack() {
        returnStack.length = 0;
    });

    function defword(name, words, immediate) {
        defheader(name, immediate);
        var enter = compileEnter();
        wordDefinitions = wordDefinitions.concat(
            words.map(function(word) {
                if (typeof word !== "string") {
                    return word;
                } else {
                    return wordDefinitions[findDefinition(word).executionToken];
                }
            })
        );
        return enter;
    }

    defjs(":", function colon() {
        defheader(readWord(), false, true);
        compileEnter();
        compiling(true);
    });

    defjs(":noname", function noname() {
        defheader("", false, true);
        stack.push(wordDefinitions.length);
        compileEnter();
        compiling(true);
    });

    defword(";", [
        "lit", "exit", ",", // Append 'exit' (so the word will return)
        "latest", "@", "hidden", // Toggle hidden flag -- unhide the word
        "[", // Go back to immediate mode
        "exit" // Return from the function
    ], true); // Immediate

    var _does = defjs("_does", function _does() {
        var wordPosition = latest();
        var doDoesPosition = instructionPointer;

        wordDefinitions[wordPosition + 1] = function doDoes() {
            stack.push(wordPosition + 2);
            returnStack.push(instructionPointer);
            instructionPointer = doDoesPosition;
        };

        instructionPointer = returnStack.pop();
    });

    defjs("does>", function does() {
        wordDefinitions.push(_does);
    }, true); // Immediate

    var _do = defjs("_do", function _do() {
        returnStack.push(wordDefinitions[instructionPointer++]);
        var top = stack.pop();
        returnStack.push(stack.pop());
        returnStack.push(top);
    });
    defjs("do", function do_() {
        wordDefinitions.push(_do);
        wordDefinitions.push(0); // Dummy endLoop
        stack.push(wordDefinitions.length - 1);
    }, true); // Immediate

    function _plusLoop() {
        var step = stack.pop();
        var index = returnStack.pop();
        var limit = returnStack.pop();
        if (index < limit && index + step < limit || index >= limit && index + step >= limit) {
            returnStack.push(limit);
            returnStack.push(index + step);
            instructionPointer += wordDefinitions[instructionPointer];
        } else {
            returnStack.pop();
            instructionPointer++;
        }
    };

    var plusLoop = defjs("+loop", function plusLoop() {
        wordDefinitions.push(_plusLoop);
        var doPosition = stack.pop();
        wordDefinitions.push(doPosition - wordDefinitions.length + 1);
        wordDefinitions[doPosition] = wordDefinitions.length;
    }, true); // Immediate

    defjs("loop", function loop() {
        wordDefinitions.push(LIT);
        wordDefinitions.push(1);
        plusLoop();
    }, true) // Immediate

    defjs("unloop", function unloop() {
        returnStack.pop();
        returnStack.pop();
        returnStack.pop();
    });

    defjs("leave", function leave() {
        returnStack.pop();
        returnStack.pop();
        instructionPointer = returnStack.pop();
    });

    defjs("i", function i() {
        stack.push(returnStack[returnStack.length - 1]);
    });

    defjs("j", function j() {
        stack.push(returnStack[returnStack.length - 4]);
    });

    defjs("recurse", function recurse() {
        wordDefinitions.push(wordDefinitions[latest() + 1]);
    }, true); // Immediate

    var quit = defword("quit", [
        "[", // Enter interpretation state
        "clearReturnStack", // Clear the return stack
        "interpret", // Interpret the next word ..
        "jump", -2 // .. and loop forever
    ]);

    function abort(error) {
        stack.length = 0;
        throw error || "";
    }
    defjs("abort", abort);

    defjs('abort"', function abortQuote() {
        var addressLength = _parse('"');
        var error = input.substring(addressLength[0], addressLength[0] + addressLength[1] + 1);
        wordDefinitions.push(function abortQuote() {
            if (stack.pop())
                abort(error);
        });
    }, true); // Immediate

    // Set the initial word
    var currentInstruction = quit;

    this.run = function(inp) {
        output = "";
        inputBufferPosition = input.length;
        toIn(0);
        input += inp + "\n";

        try {
            // As js doesn't support tail call optimisation the
            // run function uses a trampoline to execute forth code
            while (true) {
                currentInstruction();
                currentInstruction = wordDefinitions[instructionPointer++];
            }
        } catch (err) {
            if (err !== EndOfInput) {
                currentInstruction = quit;
                stack.length = 0;
                console.log("Exception at:\n" + returnStack.map(function(r) {
                    return r - 1 + " " + wordDefinitions[r - 1];
                }).join("\n") + "\n");
                console.log(output);
                throw err;
            }
        }
        return output;
    };

    this.stack = stack;
    this.definitions = wordDefinitions;
}

process.on('uncaughtException', function(err) {
    console.log(err);
    process.exit();
});

var js = require('fs');
js.readFile('./forth.f', function(err, data) {
    var forth = new Forth(global);
    if (err) throw err;
    console.log(forth.run(data.toString()));
    js.readFile('./ans-forth-tests.f', function(err, tests) {
        console.log(forth.run(tests.toString()));
        process.exit();
    });
});