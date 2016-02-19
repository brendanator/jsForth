### Todo

- ~~Sensible scrolling of output on site~~
- ~~Inline `next` into `run`~~
- ~~Pass all non-numeric ans-forth-tests and most numeric ones~~
- Use js types everywhere (number, string, boolean) 
- Compatibility layer for ans definitions?
- Stack comment forth words
- Replace `readWord` with `parse`
- Introduce stack word to allow `: over s( x1 x2 -- x1 x2 x1 ) ;`
- Introduce `js-operator` to allow binary `+ - * / % >> == >= etc` and unary `! ~` operators etc to be used in forth - [all operators](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Operators/Operator_Precedence)
- ~~Modularise codebase~~
- Implement `include-file` to asynchronously continue execution when the file is received from the server. Test it with https://github.com/gerryjackson/forth2012-test-suite/blob/master/src/prelimtest.fth
- Optimising compiler - merge all words that don't contain jumps or jump destinations
- Rename dataStack, wordDefinitions, Header, defheader, defjs, defword
- Remove public access to stack, definitions
- Implement backtick for js interop?
- Implement as much as possible outside the js kernel in forth
- Decide what to do about `/` which is supposed to return quotient but in js performs floating point division. Compatibility layer?
- Go through `starting forth` to make sure all the examples work
    + forget