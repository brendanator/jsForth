function Forth(global) {
    "use strict";

    var currentWord, nextWord;

    var wordDefinitions = [];

    var returnStack = [];

    var dataStack = [];

    var latest = (function() {
        var val = null;
        return function(value) {
            if (value !== undefined)
                val = value;
            else
                return val;
        };
    })();

    function Header(link, name, immediate, hidden) {
        this.link = link;
        this.name = name;
        this.immediate = immediate || false;
        this.hidden = hidden || false;
    }

    function defheader(name, immediate, hidden) {
        wordDefinitions.push(new Header(latest(), name, immediate, hidden));
        latest(wordDefinitions.length - 1);
    }

    function defjs(name, f, immediate, hidden) {
        defheader(name, immediate, hidden);
        wordDefinitions.push(f);
        return wordDefinitions.length - 1;
    }

    function next() {
        currentWord = wordDefinitions[nextWord];
        nextWord += 1;
    }

    // Make sure this is the first word definition
    function enter() {
        returnStack.push(nextWord);
        nextWord = currentWord + 1;
        next();
    }
    defjs("enter", enter);

    defjs("exit", function exit() {
        nextWord = returnStack.pop();
        next();
    });

    function find(word) {
        var current = latest();
        while (current !== null) {
            var wordDefinition = wordDefinitions[current];
            // Case insensitive
            if (wordDefinition.name.toLowerCase() == word.toLowerCase() && !wordDefinition.hidden)
                return current;
            current = wordDefinition.link;
        }
        return current;
    }
    defjs("find", function find() {
        dataStack.push(find(dataStack.pop()));
        next();
    });

    function defvar(name, initial) {
        defheader(name);
        var varAddress = wordDefinitions.length + 1;
        wordDefinitions.push(function() {
            dataStack.push(varAddress);
            next();
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
    var cursor = defvar(">in", 0);

    defjs("here", function() {
        dataStack.push(wordDefinitions.length);
        next();
    });

    var LIT = defjs("lit", function lit() {
        dataStack.push(wordDefinitions[nextWord]);
        nextWord += 1;
        next();
    });

    var input = "";
    var EndOfInput = (function() {})();

    function readKey() {
        var cursorPosition = cursor();
        if (cursorPosition < input.length) {
            var key = input.charAt(cursorPosition);
            cursor(cursorPosition + 1);
            return key;
        } else if (cursorPosition == input.length) {
            cursor(cursorPosition + 1);
            return " ";
        }
        throw EndOfInput;
    }
    defjs("key", function key() {
        dataStack.push(readKey());
        next();
    });

    function readWord() {
        var word = "";
        var key;
        while (true) {
            key = readKey();

            // Start of comment
            if (key === "\\") {
                // Skip comment until new line
                while (readKey() !== "\n");

                // Start of word
            } else if (!key.match(/\s/)) {
                break;
            }
        }


        while (!key.match(/\s/)) {
            word += key;
            key = readKey();
        }

        return word;
    }
    defjs("word", function word() {
        dataStack.push(readWord());
        next();
    });

    defjs("parse", function parse() {
        var delimiter = dataStack.pop();
        var string = "";
        var key = readKey();
        while (key !== delimiter) {
            string += key;
            key = readKey();
        }
        dataStack.push(string);
        next();
    });

    var output = "";
    defjs("emit", function emit() {
        output += String.fromCharCode(dataStack.pop());
    });

    // Parse a float in the provide radix
    function parseFloat(string, radix) {
        //split the string at the decimal point
        string = string.split(/\./);

        //if there is nothing before the decimal point, make it 0
        if (string[0] === '') {
            string[0] = "0";
        }

        //if there was a decimal point & something after it
        if (string.length > 1 && string[1] !== '') {
            var fractionLength = string[1].length;
            string[1] = parseInt(string[1], radix);
            string[1] *= Math.pow(radix, -fractionLength);
            return parseInt(string[0], radix) + string[1];
        }

        //if there wasn't a decimal point or there was but nothing was after it
        return parseInt(string[0], radix);
    }

    defjs("interpret", function interpret() {
        var word = readWord();
        var address = find(word);
        if (address !== null) {
            if (!compiling() || wordDefinitions[address].immediate) {
                currentWord = address + 1;
                return;
            } else {
                wordDefinitions.push(address + 1);
            }
        } else {
            var num = parseFloat(word, base());
            if (isNaN(num)) throw "Word not defined: " + word;
            if (compiling()) {
                wordDefinitions.push(LIT);
                wordDefinitions.push(num);
            } else {
                dataStack.push(num);
            }
        }
        next();
    });

    // Converts an execution token into the data field address
    defjs(">body", function dataFieldAddress() {
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] + 1;
        next();
    });

    defjs("create", function create() {
        defheader(readWord(), false, false);
        var dataFieldAddress = wordDefinitions.length+1;
        wordDefinitions.push(function pushDataFieldAddress() {
            dataStack.push(dataFieldAddress);
            next();
        });
        next();
    });

    defjs(",", function comma() {
        wordDefinitions.push(dataStack.pop());
        next();
    });


    defjs("[", function lbrac() {
        compiling(false); // Immediate
        next();
    }, true); // Immediate

    defjs("]", function rbrac() {
        compiling(true); // Compile
        next();
    });

    defjs("immediate", function immediate() {
        var wordDefinition = wordDefinitions[latest()];
        wordDefinition.immediate = !wordDefinition.immediate;
        next();
    }, true); // Immediate

    defjs("hidden", function hidden() {
        var wordDefinition = wordDefinitions[dataStack.pop()];
        wordDefinition.hidden = !wordDefinition.hidden;
        next();
    });

    defjs("!", function store() {
        var address = dataStack.pop();
        var data = dataStack.pop();
        wordDefinitions[address] = data;
        next();
    });

    defjs("@", function fetch() {
        var address = dataStack.pop();
        dataStack.push(wordDefinitions[address]);
        next();
    });

    defjs("+!", function addStore() {
        var address = dataStack.pop();
        var data = dataStack.pop();
        wordDefinitions[address] = wordDefinitions[address] + data;
        next();
    });

    defjs("-!", function subtractStore() {
        var address = dataStack.pop();
        var data = dataStack.pop();
        wordDefinitions[address] = wordDefinitions[address] - data;
        next();
    });

    defjs("'", function tick() {
        dataStack.push(find(readWord()) + 1);
        next();
    });

    defjs("[']", function bracketTick() {
        wordDefinitions.push(LIT);
        wordDefinitions.push(find(readWord()) + 1);
        next();
    }, true);

    defjs("branch", function branch() {
        nextWord += wordDefinitions[nextWord];
        next();
    });


    defjs("0branch", function falseBranch() {
        if (!dataStack.pop()) {
            nextWord += wordDefinitions[nextWord];
        } else {
            nextWord++; // Skip the offset
        }
        next();
    });

    defjs("execute", function() {
        currentWord = dataStack.pop();
    });

    // Stack operations
    defjs("drop", function drop() {
        dataStack.pop();
        next();
    });

    defjs("swap", function swap() {
        var first = dataStack[dataStack.length - 1];
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 2];
        dataStack[dataStack.length - 2] = first;
        next();
    });

    defjs("dup", function dup() {
        dataStack[dataStack.length] = dataStack[dataStack.length - 1];
        next();
    });

    defjs("over", function over() {
        dataStack[dataStack.length] = dataStack[dataStack.length - 2];
        next();
    });

    defjs("rot", function rot() {
        var third = dataStack[dataStack.length - 3];
        dataStack[dataStack.length - 3] = dataStack[dataStack.length - 2];
        dataStack[dataStack.length - 2] = dataStack[dataStack.length - 1];
        dataStack[dataStack.length - 1] = third;
        next();
    });

    defjs("-rot", - function() {
        var first = dataStack[dataStack.length - 1];
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 2];
        dataStack[dataStack.length - 2] = dataStack[dataStack.length - 3];
        dataStack[dataStack.length - 3] = first;
        next();
    });

    defjs("2drop", function twoDrop() {
        dataStack.pop();
        dataStack.pop();
        next();
    });

    defjs("2dup", function twoDup() {
        dataStack[dataStack.length] = dataStack[dataStack.length - 2];
        dataStack[dataStack.length] = dataStack[dataStack.length - 2];
        next();
    });

    defjs("2swap", function twoSwap() {
        var first = dataStack[dataStack.length - 1];
        var second = dataStack[dataStack.length - 2];
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 3];
        dataStack[dataStack.length - 2] = dataStack[dataStack.length - 4];
        dataStack[dataStack.length - 3] = first;
        dataStack[dataStack.length - 4] = second;
        next();
    });

    defjs("?dup", function nonZeroDup() {
        var first = dataStack[dataStack.length - 1];
        if (first !== 0) dataStack[dataStack.length] = first;
        next();
    });

    defjs("1+", function inc() {
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] + 1;
        next();
    });

    defjs("1-", function dec() {
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] - 1;
        next();
    });

    defjs("4+", function inc4() {
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] + 4;
        next();
    });

    defjs("4-", function dec4() {
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] - 4;
        next();
    });

    defjs("+", function add() {
        var first = dataStack.pop();
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] + first;
        next();
    });

    defjs("-", function subtract() {
        var first = dataStack.pop();
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] - first;
        next();
    });

    defjs("*", function multiply() {
        var first = dataStack.pop();
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] * first;
        next();
    });

    defjs("/", function divide() {
        var first = dataStack.pop();
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] / first;
        next();
    });

    defjs("mod", function mod() {
        var first = dataStack.pop();
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] % first;
        next();
    });

    defjs("=", function equal() {
        var first = dataStack.pop();
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] === first;
        next();
    });

    defjs("<>", function notEqual() {
        var first = dataStack.pop();
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] !== first;
        next();
    });

    defjs("<", function lessThan() {
        var first = dataStack.pop();
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] < first;
        next();
    });

    defjs(">", function greaterThan() {
        var first = dataStack.pop();
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] > first;
        next();
    });

    defjs("<=", function lessThanEqual() {
        var first = dataStack.pop();
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] <= first;
        next();
    });

    defjs(">=", function greaterThanEqual() {
        var first = dataStack.pop();
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] >= first;
        next();
    });

    defjs("0=", function isZero() {
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] === 0;
        next();
    });

    defjs("0<>", function nonZero() {
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] !== 0;
        next();
    });

    defjs("0<", function lessThanZero() {
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] < 0;
        next();
    });

    defjs("0>", function greaterThanZero() {
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] > 0;
        next();
    });

    defjs("0<=", function lessThanEqualZero() {
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] <= 0;
        next();
    });

    defjs("0>=", function greaterThanEqualZero() {
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] >= 0;
        next();
    });

    defjs("and", function and() {
        var first = dataStack.pop();
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] & first;
        next();
    });

    defjs("or", function or() {
        var first = dataStack.pop();
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] | first;
        next();
    });

    defjs("xor", function xor() {
        var first = dataStack.pop();
        dataStack[dataStack.length - 1] = dataStack[dataStack.length - 1] ^ first;
        next();
    });

    defjs("invert", function invert() {
        dataStack[dataStack.length - 1] = ~dataStack[dataStack.length - 1];
        next();
    });

    defjs("c!", function storeByte() {
        // TODO ? -  C!
        next();
    });

    defjs("c@", function fetchByte() {
        // TODO ? -  C@
        next();
    });

    defjs("c@c!", function copyByte() {
        // TODO ? -  C@C!
        next();
    });

    defjs("cmove", function moveByte() {
        // TODO ? -  CMOVE
        next();
    });

    // Return stack
    defjs(">r", function toR() {
        returnStack.push(dataStack.pop());
        next();
    });

    defjs("r>", function rFrom() {
        dataStack.push(returnStack.pop());
        next();
    });

    defjs("r@", function rFetch() {
        dataStack.push(returnStack[returnStack.length - 1]);
        next();
    });

    defjs("2r>", function twoRFrom() {
        var top = returnStack.pop();
        dataStack.push(returnStack.pop());
        dataStack.push(top);
        next();
    });

    defjs("2>r", function twoToR() {
        var top = dataStack.pop();
        returnStack.push(dataStack.pop());
        returnStack.push(top);
        next();
    });

    defjs("2r@", function twoRFetch() {
        dataStack.push(returnStack[returnStack.length - 2]);
        dataStack.push(returnStack[returnStack.length - 1]);
        next();
    });

    // Data stack
    defjs("dsp@", function fetchDataStackPointer() {
        // TODO ? -  DSP@
        next();
    });

    defjs("dsp!", function storeDataStackPointer() {
        // TODO ? -  DSP!
        next();
    });

    defjs("char", function char() {
        dataStack.push(readWord().charAt(0));
        next();
    });

    defjs(".", function print() {
        var top = dataStack.pop();

        var value;
        if (typeof top === "undefined")
            value = "undefined";
        else if (top === null)
            value = "null";
        else
            value = top.toString(base()); // Output numbers in current base

        output += value;
        next();
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
        var constructor = dataStack.pop();
        var argsCount = parseInt(path.match(/\{(\d*)\}/)[1] || 0);
        var args = [null]; // new replaces the first argument with this
        for (var j = 0; j < argsCount; j++) {
            args.push(dataStack.pop());
        }
        // Use new operator with any number of arguments
        return new(Function.prototype.bind.apply(constructor, args))();
    }

    function jsFunctionCall(path) {
        var argsCount = parseInt(path.match(/\{(\d*)\}/)[1] || 0);
        var obj = dataStack.pop();
        path = path.match(/[^\{]*/)[0];
        var func = path ? obj[path] : obj;
        var args = [];
        for (var j = 0; j < argsCount; j++) {
            args.push(dataStack.pop());
        }
        return func.apply(obj, args);
    }

    var jsAssignmentRegex = /(^[A-Za-z$_][\w$_]*!$)|(^\d+!$)/; // name!
    var jsNewCallRegex = /new\{\d*\}$/; // new{2}
    var jsFunctionCallRegex = /((^[A-Za-z$_][\w$_]*)|(^\d+))?\{\d*\}$/; // getElementById{1}

    function jsInterop(js) {
        if (js.startsWith("/")) { // Add global to stack
            dataStack.push(global);
        } else if (!js.startsWith(".")) {
            throw "js interop call must start with '/' or '.'";
        }

        var paths = js.length > 1 ? js.substring(1).split(".") : [];

        for (var i = 0; i < paths.length; i++) {
            var path = paths[i];

            if (path.match(jsAssignmentRegex)) {
                dataStack.pop()[path.substring(0, path.length - 1)] = dataStack.pop();
            } else if (path.match(jsNewCallRegex)) {
                dataStack.push(jsNewCall(path));
            } else if (path.match(jsFunctionCallRegex)) {
                dataStack.push(jsFunctionCall(path));
            } else { // Property access
                dataStack.push(dataStack.pop()[path]);
            }
        }
    }

    var JS = defjs("js", function js() {
        jsInterop(dataStack.pop());
        next();
    });

    defjs("js", function js() {
        if (compiling()) {
            wordDefinitions.push(LIT);
            wordDefinitions.push(readWord());
            wordDefinitions.push(JS);
        } else {
            jsInterop(readWord());
        }
        next();
    }, true);

    defjs("cr", function cr() {
        output += "\n";
        next();
    });

    defjs("clearReturnStack", function clearReturnStack() {
        returnStack.length = 0;
        next();
    });

    function defword(name, words, immediate, hidden) {
        var codeFieldAddress = wordDefinitions.length + 1;

        defheader(name, immediate, hidden);
        wordDefinitions.push(enter);
        wordDefinitions = wordDefinitions.concat(
            words.map(function(word) {
                if (typeof word !== "string") {
                    return word;
                } else {
                    return find(word) + 1;
                }
            })
        );

        return codeFieldAddress;
    }

    defword("hide", [
        "word", // Get the word (after 'hide')
        "find", // Look up in the dictionary
        "hidden", // Make word hidden
        "exit", // Return from the function
    ]);

    defjs(":", function colon() {
        defheader(readWord(), false, true);
        wordDefinitions.push(enter);
        compiling(true);
        next();
    });

    defjs(":noname", function noname() {
        defheader("", false, true);
        dataStack.push(wordDefinitions.length);
        wordDefinitions.push(enter);
        compiling(true);
        next();
    });

    defword(";", [
        "lit", "exit", ",", // Append 'exit' (so the word will return)
        "latest", "@", "hidden", // Toggle hidden flag -- unhide the word
        "[", // Go back to immediate mode
        "exit" // Return from the function
    ], true); // Immediate

    var _does = defjs("_does", function _does() {
        var wordPosition = latest();
        var doDoesPosition = nextWord;

        wordDefinitions[wordPosition + 1] = function doDoes() {
            dataStack.push(wordPosition + 2);
            returnStack.push(nextWord);
            nextWord = doDoesPosition;
            next();
        };

        nextWord = returnStack.pop();
        next();
    });

    defjs("does>", function does() {
        wordDefinitions.push(_does);
        next();
    }, true); // Immediate

    var _do = defjs("_do", function _do() {
        returnStack.push(wordDefinitions[nextWord++]);
        var top = dataStack.pop();
        returnStack.push(dataStack.pop());
        returnStack.push(top);
        next();
    });
    defjs("do", function do_() {
        wordDefinitions.push(_do);
        wordDefinitions.push(0); // Dummy endLoop
        dataStack.push(wordDefinitions.length-1);
        next();
    }, true); // Immediate

    var _plusLoop = defjs("_+loop", function _plusLoop() {
        var step = dataStack.pop();
        var index = returnStack.pop();
        var limit = returnStack.pop();
        if (index < limit && index+step < limit || index >= limit && index+step >= limit) {
            returnStack.push(limit);
            returnStack.push(index+step);
            nextWord += wordDefinitions[nextWord];
        } else {
            returnStack.pop();
            nextWord++;
        }
        next();
    });

    defjs("loop", function loop() {
        wordDefinitions.push(LIT);
        wordDefinitions.push(1);
        wordDefinitions.push(_plusLoop);

        var doPosition = dataStack.pop();
        wordDefinitions.push(doPosition - wordDefinitions.length + 1);
        wordDefinitions[doPosition] = wordDefinitions.length;
        next();
    }, true); // Immediate

    defjs("+loop", function plusLoop() {
        wordDefinitions.push(_plusLoop);
        wordDefinitions.push(dataStack.pop() - wordDefinitions.length);
        next();
    }, true); // Immediate

    defjs("unloop", function unloop() {
        returnStack.pop();
        returnStack.pop();
        returnStack.pop();
        next();
    });

    defjs("leave", function leave() {
        returnStack.pop();
        returnStack.pop();
        nextWord = returnStack.pop();
        next();
    });

    defjs("i", function i() {
        dataStack.push(returnStack[returnStack.length-1]);
        next();
    });

    defjs("j", function j() {
        dataStack.push(returnStack[returnStack.length-4]);
        next();
    });

    defjs("recurse", function recurse() {
        wordDefinitions.push(latest() + 1);
        next();
    }, true); // Immediate

    var quit = defword("quit", [
        "[", // Enter interpretation state
        "clearReturnStack", // Clear the return stack
        "interpret", // Interpret the next word ..
        "branch", -2 // .. and loop forever
    ]);

    // Set the initial word
    currentWord = quit;

    // As js doesn't support tail call optimisation on most browsers the run
    // function uses a trampoline to run forth
    this.run = function(inp) {
        output = "";
        input = inp;
        cursor(0);

        // console.log(wordDefinitions);

        try {
            while (true) {
                // console.log(wordDefinitions);
                // console.log("IN: " + input);
                // console.log(wordDefinitions[currentWord - 1]);
                // console.log(wordDefinitions.slice(latest()));
                // console.log("JA: " + jsArray[wordDefinitions[currentWord]]);

                wordDefinitions[currentWord]();
                // console.log("CW2" + currentWord);
                // console.log(dataStack);
            }
        } catch (err) {
            if (err !== EndOfInput) {
                currentWord = quit;
                throw err;
            }
        }
        return output;
    };

    this.stack = dataStack;
    this.definitions = wordDefinitions;
}

process.on('uncaughtException', function(err) {
    console.log(err);
    process.exit();
});

require('fs').readFile('./forth.f', function (err, data) {
    var forth = new Forth(global);
    if (err) throw err;
    console.log(forth.run(data.toString()));
    process.exit();
});
