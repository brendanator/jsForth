#! /usr/bin/env node

var Forth = require("../kernel/forth.js")
var fs = require("fs");

var forth = new Forth();
fs.readFile("./forth/forth.fth", function(err, data) {
    fs.readFile("./test/ans-forth-tests.fth", function(err, tests) {
        console.log(forth.run(data.toString()));
        console.log(forth.run(tests.toString()));
        console.log(forth.run("some magic input!"));
        process.exit();
    });
});