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

\ ( ... ) Comments
: (  [char] ) parse 2drop ; immediate
: .( [char] ) parse type ; immediate
: s" [char] " parse swap postpone literal postpone literal ; immediate
: ." [char] " parse swap postpone literal postpone literal ['] type compile, ; immediate

: if ['] jumpIfFalse compile, here 0 , ; immediate
: then dup here swap - swap ! ; immediate
: else ['] jump compile, here 0 , swap postpone then ; immediate

: begin here ; immediate
: again ['] jump compile, here - , ; immediate
: until ['] jumpIfFalse compile, here - , ; immediate
: while ['] jumpIfFalse compile, 0 , here 1- swap ; immediate
: repeat ['] jump compile, here - , postpone then ; immediate

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
: fill -rot dup 0 > if 0 do 2dup i + ! loop 2drop else drop drop drop then ;

: move ( addr1 addr2 u -- )
    dup 0 > if
        -rot 2dup > if \ Choose direction to avoid overwriting source data before it has been copied
            rot 0 do over i + @ over i + ! loop
        else
            rot 0 swap 1 - do over i + @ over i + ! -1 +loop
        then
        2drop
    else
        drop drop drop
    then
;

: nip swap drop ;
: count dup @ ;

: constant create , does> @ ;
: variable create cell allot ;
: bl 32 ;
: space bl emit ;
: spaces dup 0 > if 0 do bl emit loop else drop then ;

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

: u. ( u -- ) unsigned . ;
