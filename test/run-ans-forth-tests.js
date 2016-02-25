#! /usr/bin/env node

var Forth = require("../kernel/forth.js");
var fs = require("fs");

var forth = new Forth();

function outputCallback(error, output) {
    console.log(output);
    if (error) {
        console.error(error);
    }
}

fs.readFile(__dirname + "/../forth/forth.fth", "utf8", function(err, data) {
    fs.readFile(__dirname + "/runtests.fth", "utf8", function(err, tests) {
        forth.run(data, outputCallback);
        forth.run(tests, outputCallback);
    });
});