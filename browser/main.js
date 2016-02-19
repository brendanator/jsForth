var Forth = require("../kernel/forth.js");

function Repl() {
    "use strict";

    var forth = Forth();

    function loadForth(file) {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                console.log(forth.run(xmlhttp.responseText));
                showStack();
            }
        };
        xmlhttp.open("GET", file, true);
        xmlhttp.send();
    }
    loadForth("forth/forth.fth");
    // loadForth("test/ans-forth-tests.fth");

    var inputHistory = [""];
    var historyCount = 0;
    var historySelection = 0;

    function useHistory(selection) {
        var inputNode = document.getElementById("input");

        if (inputNode.value !== inputHistory[historySelection]) {
            historySelection = historyCount - 1;
            inputHistory[historyCount] = inputNode.value;
        } else {
            historySelection = Math.min(Math.max(selection, 0), inputHistory.length - 1);
        }

        inputNode.value = inputHistory[historySelection];
        inputNode.selectionStart = inputNode.value.length;
    }

    function updateHistory(input) {
        // Remove duplicates
        for (var i = inputHistory.length - 1; i >= 0; i--) {
            if (inputHistory[i] === input) {
                inputHistory.splice(i, 1);
                historyCount--;
            }
        }
        inputHistory[historyCount] = input;
        historyCount = inputHistory.length;
        historySelection = inputHistory.length;
        inputHistory.push("");
    }

    function createOutputNode(icon, text, className) {
        var outputNode = document.createElement("div");

        var textNode = document.createElement("textarea");
        textNode.className = className;
        textNode.readOnly = true;
        textNode.cols = 80;
        text = icon + " " + text;
        // Roughly guess the number of rows by assuming lines wrap every 80 characters
        textNode.rows = text.split("\n").map(function(l) {
            return (l.length / 80) + 1;
        }).reduce(function(p, c) {
            return p + c;
        }, 0);
        textNode.value = text;
        outputNode.appendChild(textNode);

        document.getElementById("output").appendChild(outputNode);
    }

    function runforth() {
        var inputNode = document.getElementById("input");
        var input = inputNode.value.trim();
        if (input) {
            updateHistory(input);
            createOutputNode("\u2192", input, "user-output");

            try {
                var output = forth.run(input);
                if (output) {
                    createOutputNode("\u2190", output, "forth-output");
                }
            } catch (err) {
                createOutputNode("X", err, "error");
                throw err;
            } finally {
                showStack();
                inputNode.value = "";
                var outputNode = document.getElementById("output");
                outputNode.scrollTop = outputNode.scrollHeight;
            }
        }
    }

    function showStack() {
        var stack = forth.stack;
        var stackNode = document.getElementById("stack");
        // Clear stack
        while (stackNode.firstChild) stackNode.removeChild(stackNode.firstChild);

        for (var i = 1; i <= stack.length(); i++) {
            var element = document.createElement("span");
            element.className = "stack-element";
            element.textContent = String(stack.peek(i));
            stackNode.appendChild(element);
        }
    }

    return {
        interpret: function(event) {
            if (event.keyCode == 13 && !event.shiftKey)
                runforth();
            else if (event.keyCode == 80 && event.ctrlKey)
                useHistory(historySelection - 1);
            else if (event.keyCode == 78 && event.ctrlKey)
                useHistory(historySelection + 1);
        }
    };
}

global.repl = Repl();