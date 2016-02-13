## jsForth

An implementation of [Forth](https://en.wikipedia.org/wiki/Forth_(programming_language)) in Javascript

Try it out [here](https://brendanator.github.io/jsForth/) 

### Rationale

I wanted to learn a [concatenative programming language](https://en.wikipedia.org/wiki/Concatenative_programming_language) and thought the best way to do so would be to implement one myself

### ANS Forth

jsForth implements the full core ANS standard, however native js types are used instead of those specified in the standard:

#### Numbers
js numbers are floating point and so all numeric operations operate on floating point values

#### Strings
js strings are used instead of counted strings and may replace character strings

#### Booleans 
js `true` and `false` are used instead of flags `-1` and `0`. js boolean coercion means that numbers will work as expected with `if`, `while` and `until`

### Threading model - trampolined threading

All of the standard [threading models](https://en.wikipedia.org/wiki/Threaded_code#Threading_models) require `call` or `jump` to execute the next instruction. In js these both translate into functions calls in tail position. Without tail call optimisation this will lead to a stack overflow. Therefore jsForth uses a trampoline to execute instructions.

ECMAScript 6 specifies tail call optimisation but unfortunately most [browsers don't support it yet](https://kangax.github.io/compat-table/es6/)
