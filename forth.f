: \ 10 parse 2drop ; immediate \ Single line comments

: binary 2 base ! ;
: octal 8 base ! ;
: decimal 10 base ! ;
: hex 16 base ! ;

\ Compilation: ( "<spaces>name" -- )
\   Parse name delimited by a space. Find name. 
\   Append the compilation semantics of name to the current definition.
: postpone word find 0 = abort" Word not found" compile, ; immediate

\ Compilation: ( "<spaces>name" -- )
\   Parse name delimited by a space. Find name. 
\   If name has other than default compilation semantics, 
\     append them to the current definition; 
\   otherwise append the execution semantics of name.
: [compile] postpone postpone ; immediate

\ Compilation: ( x -- )
\   Append the run-time semantics given below to the current definition.
\ Run-time: ( -- x )
\   Place x on the stack.
: literal ['] lit compile, , ; immediate

: [char] ['] lit compile, char , ; immediate


: if ['] jumpIfFalse compile, here 0 , ; immediate
: then dup here swap - swap ! ; immediate
: else ['] jump compile, here 0 , swap postpone then ; immediate

: begin here ; immediate
: again ['] jump compile, here - , ; immediate
: until ['] jumpIfFalse compile, here - , ; immediate
: while ['] jumpIfFalse compile, 0 , here swap ; immediate
: repeat ['] jump compile, here - , postpone then ; immediate

\ ( ... ) Comments
: (
    1                       \ allowed nested parens by keeping track of depth
    begin
        key                 \ read next character
        dup [char] ( = if   \ open paren?
            drop            \ drop the open paren
            1+              \ depth increases
        else
            [char] ) = if   \ close paren?
                1-          \ depth decreases
            then
        then
    dup 0 = until           \ continue until we reach matching close paren, depth 0
    drop                    \ drop the depth counter
; immediate

: s"
    ['] lit compile,
    [char] " parse swap , 
    ['] lit compile, ,
; immediate

: ."
    ['] lit compile,
    [char] " parse swap , 
    ['] lit compile, ,
    ['] type compile,
; immediate

: cell 1 ;
: cell+ 1+ ;
: cells ;
: char+ 1+ ;
: chars ;
: 2@ dup cell+ @ swap @ ;
: 2! swap over ! cell+ ! ;
: c, , ;
: c@ @ ;
: c! ! ;
: align ;
: aligned ;

: nip swap drop ;

: constant create , does> @ ;
: variable create cell allot ;
: bl 32 ;
: space bl emit ;
: spaces 0 do bl emit loop ;

: 0= 0 = ;
: 0<> 0 <> ;
: 0< 0 < ;
: 0> 0 > ;
: 0<= 0 <= ;
: 0>= 0 >= ;

4294967296 constant max-uint
: /mod 2dup mod -rot / ;
: s>d max-uint /mod ; \ convert single to double
: d>s max-uint * + ;
: u< unsigned swap unsigned > ;
: u> unsigned swap unsigned < ;
: um* unsigned swap unsigned * s>d ;
: */ -rot * swap / ;
: um/mod unsigned swap unsigned swap /mod ;
: fm/mod -rot d>s swap /mod ;
: sm/rem -rot d>s swap /mod ;
: */mod */ ;
\  ( n1 n2 -- d )
\    d is the signed product of n1 times n2.
: m* * s>d ; \ multiply 2 singles into a double
