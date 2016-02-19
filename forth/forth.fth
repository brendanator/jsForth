: \ 10 parse 2drop ; immediate \ Single line comments

\ Built in numeric radices
: binary 2 base ! ;
: octal 8 base ! ;
: decimal 10 base ! ;
: hex 16 base ! ;

\ Control structures
: if ['] jumpIfFalse compile, here 0 , ; immediate
: then dup here swap - swap ! ; immediate
: else ['] jump compile, here 0 , swap dup here swap - swap ! ; immediate
: begin here ; immediate
: again ['] jump compile, here - , ; immediate
: until ['] jumpIfFalse compile, here - , ; immediate
: while ['] jumpIfFalse compile, 0 , here 1 - swap ; immediate
: repeat ['] jump compile, here - , dup here swap - swap ! ; immediate

\ Compilation: ( "<spaces>name" -- )
\   Parse name delimited by a space. Find name.
\   Append the compilation semantics of name to the current definition.
: postpone 32 word find dup 0 = abort" Word not found"
    0 > if
        compile,
    else
        ['] lit compile, ,      \ executionToken literal
        ['] compile, compile,   \ compile it when run
    then
; immediate

\ Compilation: ( x -- )
\   Append the run-time semantics given below to the current definition.
\ Run-time: ( -- x )
\   Place x on the stack.
: literal ['] lit compile, , ; immediate
: [char] char postpone literal ; immediate

: t [char] t ;
\ ( ... ) Comments
: (  begin key [char] ) = until ; immediate
: .( [char] ) parse type ; immediate
: s" [char] " parse swap postpone literal postpone literal ; immediate
: ." [char] " parse swap postpone literal postpone literal ['] type compile, ; immediate

: cell 1 ;
: cell+ 1 + ;
: cells ;
: char+ 1 + ;
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
: count dup 1 + swap @ ;

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
: 1+ 1 + ;
: 1- 1 - ;

: */ -rot * swap / ;
: /mod 2dup mod -rot / ;
: unsigned 0 rshift ;
: u< unsigned swap unsigned > ;
: u> unsigned swap unsigned < ;

: u. ( u -- ) unsigned . ;

create pad 128 allot
