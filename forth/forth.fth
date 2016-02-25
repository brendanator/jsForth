: \ 10 word drop ; immediate \ Single line comments

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

\ ( ... ) Comments
: (  begin key ')' = until ; immediate

\ Spaces
: bl ( -- char ) 32 ;
: space ( -- ) bl emit ;
: spaces ( n -- ) dup 0 > if 0 do bl emit loop else drop then ;


  \ Compilation: ( "<spaces>name" -- )
  \   Parse name delimited by a space. Find name.
  \   Append the compilation semantics of name to the current definition.
: postpone bl word find dup 0 = abort" Word not found"
    0 > if
        compile,
    else
        ['] lit compile, ,      \ executionToken literal
        ['] compile, compile,   \ compile it when run
    then
; immediate

\ Literals
  \ Compilation:   Append the run-time semantics given below to the current definition.
  \ Run-time: ( -- x )     Place x on the stack.
: literal ['] lit compile, , ; immediate
: sliteral ( c-addr1 u -- ) swap postpone literal postpone literal ; immediate
: [char] char postpone literal ; immediate

\ Strings
: .( ( display "ccc<paren>" -- ) ')' parse type ; immediate
: s" ( "ccc<quote>" -- ) ( -- c-addr u ) '"' parse postpone sliteral ; immediate
: ." ( "ccc<quote>" -- ) ( display ) '"' parse postpone sliteral postpone type ; immediate

\ Addresses
: cell ( -- n ) 1 ;
: cell+ ( addr1 -- add2 ) 1 + ;
: cells ( n1 -- n2) ;
: char+ ( addr1 -- add2) 1 + ;
: chars ( n1 -- n2 ) ;
: c, ( char -- ) , ;
: c@ ( addr -- char ) @ ;
: c! ( char addr -- ) ! ;
: count ( c-addr1 -- caddr2 u ) dup 1 + swap c@ ;
: 2@ ( addr - x1 x2 ) dup cell+ @ swap @ ;
: 2! ( x1 x2 addr -- ) swap over ! cell+ ! ;
: align ( -- ) ;
: aligned ( addr -- addr ) ;
: fill ( addr u char -- ) -rot dup 0 > if 0 do 2dup i + ! loop 2drop else drop drop drop then ;
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

\ Stack operations
: nip ( x1 x2 -- x2 ) swap drop ;
: tuck ( x1 x2 -- x2 x1 x2 ) dup -rot ;

\ Numeric operations
: 0= ( x -- boolean ) 0 = ;
: 0<> ( x -- boolean ) 0 <> ;
: 0< ( x -- boolean ) 0 < ;
: 0> ( x -- boolean ) 0 > ;
: 0<= ( x -- boolean ) 0 <= ;
: 0>= ( x -- boolean ) 0 >= ;
: 1+ ( u1 -- u2 ) 1 + ;
: 1- ( u1 -- u2 ) 1 - ;
: */ ( n1 n2 n3 -- n4 ) -rot * swap / ;
: /mod ( n1 n2 -- n3 n4 ) 2dup mod -rot / ;
: unsigned ( n -- u ) 0 rshift ;
: u< ( n1 n2 -- boolean ) unsigned swap unsigned > ;
: u> ( n1 n2 -- boolean ) unsigned swap unsigned < ;
: u. ( u -- ) unsigned . ;
: .r ( n w -- ) drop . ; \ Dummy implementation

: environment? 2drop false ; \ Dummy implementation

\ Constants and variables
: constant ( x "<spaces>name" -- ) create , does> @ ;
: variable ( "<spaces>name" -- )  create cell allot ;

\ String operations
: -trailing ( c-addr u1 -- c-addr u2 ) 
  begin
    2dup + 1- @ bl = over 0> and
  while
    1-
  repeat
;

: /string ( c-addr1 u1 n -- c-addr2 u2 )
  dup -rot - -rot + swap
;

: blank ( c-addr u -- )
  dup 0 > if
    0 do
      bl over i + !
    loop
    drop
  else
    2drop
  then  
;

: cmove ( c-addr1 c-addr2 u -- )
  dup 0 > if
    0 do
      over i + @ over i + !
    loop
  else
    drop
  then  
  2drop
;

: cmove> ( c-addr1 c-addr2 u -- )
  dup 0 > if
    0 swap 1 - do 
      over i + @ over i + ! -1 
    +loop
  else
    drop
  then  
  2drop
;

: compare ( c-addr1 u1 c-addr2 u2 -- n )
  rot 2swap 2over min
  dup 0= if
      drop
  else
    0 do 2dup i + @ swap i + @ 2dup = if
        2drop
      else
        < if 1 else -1 then
        -rot 2drop -rot 2drop unloop exit
      then
    loop
  then
  2drop 2dup = if
    2drop 0
  else
    < if 1 else -1 then
  then
;

: search ( c-addr1 u1 c-addr2 u2 -- c-addr3 u3 boolean )
  2over 
  begin ( c-addr1 u1 c-addr2 u2 c-addr3 u3 )
    2over 2over drop over compare 0= if \ found string
      2swap 2drop 2swap 2drop true exit
    else dup 4 pick >= if \ still enough string left
      1 /string
    else
      2drop 2drop false exit
    then then
  again
;

\ Create the pad
create pad 1000 allot


\ [IF] [THEN] [ELSE] compile directives
: [ELSE] ( -- ) 
  1 begin bl word count dup while                    \ level adr len 
      2dup s" [IF]" compare 0= if                    \ level adr len 
        2drop 1 +                                    \ level' 
      else                                           \ level adr len 
        2dup s" [ELSE]" compare 0= if                \ level adr len 
          2drop 1- dup if 1+ then                    \ level' 
        else                                         \ level adr len 
          s" [THEN]" compare 0= if                   \ level 
            1-                                       \ level' 
          then 
        then 
      then ?dup 0= if exit then                      \ level' 
    repeat 2drop                                     \ level 
  drop 
; immediate 

: [IF] ( boolean -- ) 
   0= if postpone [ELSE] then 
; immediate

: [THEN] ( -- ) ; immediate
