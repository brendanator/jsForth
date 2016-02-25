#! /usr/bin/env node

var Forth = require("../kernel/forth.js");
var fs = require("fs");

var forth = new Forth(function(output) {
    console.log(output);
});

fs.readFile(__dirname + "/../forth/forth.fth", "utf8", function(err, data) {
    fs.readFile(__dirname + "/runtests.fth", "utf8", function(err, tests) {
        forth.run(data);
        forth.run(tests);
    });
});