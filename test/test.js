#! usr/bin/env node

process.on("uncaughtException", function(err) {
    console.log(err);
    process.exit();
});

var forth = require("../kernel/forth.js");

var js = require("fs");

js.readFile("../forth/forth.fth", function(err, data) {
    if (err) throw err;
    console.log(forth.run(data.toString()));
    js.readFile("../forth/ans-forth-tests.fth", function(err, tests) {
        console.log(forth.run(tests.toString()));
        console.log(forth.run("some magic input!"));
        process.exit();
    });
});