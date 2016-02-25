### Todo

- ~~Sensible scrolling of output on site~~
- ~~Inline `next` into `run`~~
- ~~Pass all non-numeric ans-forth-tests and most numeric ones~~
- ~~Modularise codebase~~
- ~~Implement `include` to asynchronously continue execution when the file is received from the server~~
- ~~Stack comment forth words~~
- Introduce stack word to allow `: over s( x1 x2 -- x1 x2 x1 ) ;`
- Introduce `js-operator` to allow binary `+ - * / % >> == >= etc` and unary `! ~` operators etc to be used in forth - [all operators](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Operators/Operator_Precedence)
- Optimising compiler - merge all words that don't contain jumps or jump destinations
- Rename dataStack, wordDefinitions, Header, defheader, defjs, defword
- Remove public access to stack, definitions
- Implement backtick for js interop?
- Go through `starting forth` to make sure all the examples work
    + forget