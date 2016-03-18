## pop, dup, swap, dip are universal stack operations - sketch of proof 

> For Joy itself the following seems to be an adequate base for shuffling the stack: the three simple operators swap dup and pop, together with the combinator dip.
> [Manfred von Thun](http://www.nsl.com/papers/interview.htm)


    // Bring element `n-th from top` to the top
    bring-up(0) = noop
    bring-up(1) = swap
    bring-up(2) = [swap] dip swap
    bring-up(n) = [bring-to-top(n-1)] dip swap

    // Push top element to `n-th from top` position
    push-down(0) = noop
    push-down(1) = swap
    push-down(2) = swap [swap] dip
    push-down(n) = swap [push-down(n-1)] dip

    // Delete `n-th from top` element
    delete(n) = bring-up(n) pop

    // Make a copy of `n-th from top` element
    copy(n) = bring-up(n) dup push-down(n+1)

Given any starting stack and any final stack we can use the above operations to go from starting stack to final stack:

1. delete all elements not in final result
2. copy elements that occur multiple times until stack contains all final elements
3. for each final index from bottom, bring-up top matching element from current index, push-down to final position
