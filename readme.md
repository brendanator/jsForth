## jsForth

An implementation of [Forth](https://en.wikipedia.org/wiki/Forth_(programming_language)) in JavaScript

Try it out [here](https://brendanator.github.io/jsForth/) 

### ANS Forth

jsForth implements the full core ANS standard

The following word sets are implemented:

- Core words - fully implemented
    - All tests pass except some integer multiplication/division edge cases where the ANS spec differs from the results given by the [long](https://github.com/dcodeIO/long.js) package
- Core plus words - fully implemented and all tests pass
- Core extension words - fully implemented and all tests pass

The ANS Forth tests can be run using `npm run test` or in the intepreter with the following Forth code
```
include test/verbose-tester.fth
include https://raw.githubusercontent.com/gerryjackson/forth2012-test-suite/master/src/core.fr
```
The complete test suite is available [here](https://github.com/gerryjackson/forth2012-test-suite/)

### JavaScript interoperability

- global variable access   `js /document`
- array access             `js .0.2`
- property access          `js .name`
- property setting         `js .name!`
- function calling         `js .sin{1}`
- method calling           `js /document.getElementById{1}`
- new with params          `js .new{1}`

### Threading model - trampolined threading

All of the standard [threading models](https://en.wikipedia.org/wiki/Threaded_code#Threading_models) require `call` or `jump` to execute the next instruction. In JavaScript these both translate into functions calls in tail position. Without tail call optimisation this will lead to a stack overflow. Therefore jsForth uses a trampoline to execute instructions.

ECMAScript 6 specifies tail call optimisation, but unfortunately most [browsers don't support it yet](https://kangax.github.io/compat-table/es6/).
