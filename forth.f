: decimal 10 base ! ;
: hex 16 base ! ;
: octal 8 base ! ;

: literal immediate ['] lit , , ;
: postpone immediate word find 1+ , ;
: [char] immediate ['] lit , char , ;


: if immediate ['] 0branch , here 0 , ;
: else immediate ['] branch , here 0 , swap dup here swap - swap ! ;
: then immediate dup here swap - swap ! ;


: begin here ; immediate
: again ['] branch , here - , ; immediate
: until ['] 0branch , here - , ; immediate
: while ['] 0branch , 0 , here swap ; immediate
: repeat ['] branch here - , dup here swap - swap ! ; immediate

\ ( ... ) Comments
: '(' [char] ( ;
: ')' [char] ) ;
: (
    1                   \ allowed nested parens by keeping track of depth
    begin
        key             \ read next character
        dup '(' = if    \ open paren?
            drop        \ drop the open paren
            1+          \ depth increases
        else
            ')' = if    \ close paren?
                1-      \ depth decreases
            then
        then
    dup 0= until        \ continue until we reach matching close paren, depth 0
    drop                \ drop the depth counter
; immediate

: '"' [char] " ;
: S"
    ['] lit ,
    '"' parse ,
; immediate

: ."
    ['] lit ,
    '"' parse ,
    ['] . ,
; immediate

: a ." boom" ;
a

:noname ." anon word was called" cr ;   \ pushes xt on the stack
dup execute execute         \ executes the anon word twice
