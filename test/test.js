#! usr/bin/env node

var fs = require("fs");

fs.readFile("../forth/forth.fth", function(err, data) {
    fs.readFile("../forth/ans-forth-tests.fth", function(err, tests) {
        var forth = require("../kernel/forth.js");
        console.log(forth.run(data.toString()));
        console.log(forth.run(tests.toString()));
        console.log(forth.run("some magic input!"));
        process.exit();
    });
});