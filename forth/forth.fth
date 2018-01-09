: \ #10 parse 2drop ; immediate \ Single line comments

\ Built in numeric radices
: binary #2 base ! ;
: octal #8 base ! ;
: decimal #10 base ! ;
: hex #16 base ! ;

\ Control structures
: if ['] jumpIfFalse compile, here 0 , ; immediate
: then dup here swap - swap ! ; immediate
: begin here ; immediate
: again ['] jump compile, here - , ; immediate
: until ['] jumpIfFalse compile, here - , ; immediate
: ahead ['] jump compile, here 0 , ; immediate
: cs-pick pick ;
: cs-roll roll ;

  \ Compilation: ( "<spaces>name" -- )
  \   Parse name delimited by a space. Find name.
  \   Append the compilation semantics of name to the current definition.
: postpone #32 word find dup 0 = abort" Word not found"
    0 > if
        compile,
    [ ahead 1 cs-roll then ]    \ inline else - it's not defined yet
        ['] lit compile, ,      \ executionToken literal
        ['] compile, compile,   \ compile the executionToken
    then
; immediate

: else postpone ahead 1 cs-roll postpone then ; immediate
: while postpone if 1 cs-roll ; immediate
: repeat postpone again postpone then ; immediate

: case 0 ; immediate \ init count of ofs

: of
   1 +                      \ increment count ofs
   >r                       \ move off the stack to check the case
   postpone over postpone = \ copy and test case value
   postpone if              \ add orig to control flow stack
   postpone drop            \ discards case value if =
   r>                       \ we can bring count back now
; immediate

: endof \ orig1 #of -- orig2 #of
   >r                    \ move off the stack
   postpone else
   r>                    \ we can bring count back now
; immediate

: endcase \ orig1..orign #of --
  postpone drop          \ discard case value
  0 ?do
    postpone then
  loop
; immediate


\ ( ... ) Comments
: (  begin key ')' = until ; immediate


\ Spaces
: bl ( -- char ) #32 ;
: space ( -- ) bl emit ;
: spaces ( n -- ) dup 0 > if 0 do bl emit loop else drop then ;

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
: .s ( -- ) dup . ;

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
: erase ( addr u -- ) 0 fill ;
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
: c"
  '"' parse         \ parse string
  postpone ahead    \ jump over counted string
  here 2>r          \ save counted string pointer
  dup here !        \ write count
  here swap move    \ write string
  2r> swap
  postpone then
  postpone literal
; immediate

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
: holds ( addr u -- )
  begin
    dup
  while
    1- 2dup + c@ hold
  repeat
  2drop
;
: /mod ( n1 n2 -- n3 n4 ) 2dup mod -rot / ;
: unsigned ( n -- u ) 0 rshift ;
: u< ( n1 n2 -- boolean ) unsigned swap unsigned > ;
: u> ( n1 n2 -- boolean ) unsigned swap unsigned < ;
: u. ( u -- ) unsigned . ;
: u.r ( u w -- ) swap unsigned swap .r ;

: environment? 2drop false ; \ Dummy implementation
: unused $ffffff here - ;
: buffer: ( u "<name>" – ; – addr ) \ Create a buffer of u address units whose address is returned at run time.
   create allot
;

\ Constants and variables
: constant ( x "<spaces>name" -- ) create , does> @ ;
: variable ( "<spaces>name" -- )  create cell allot ;
: value ( "<spaces>name" -- )  create , does> @ ;
: to ( x1 "<spaces>name" -- )
   ' >body
   state @ if
     postpone literal postpone !
   else
     !
   then
; immediate

\ Defer, defer!, defer@, is, action-of
: defer ( "name" -- )
  create ['] abort ,
does> ( ... -- ... )
  @ execute
;

: defer! ( xt2 xt1 -- )
   >body !
;

: defer@ ( xt1 -- xt2 )
   >body @
;

: is
  state @ if
    postpone ['] postpone defer!
  else
    ' defer!
  then
; immediate

: action-of
  state @ if
    postpone ['] postpone defer@
  else
    ' defer@
  then
; immediate

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
create pad 1000 cells allot


\ [IF] [THEN] [ELSE] compile directives
: [ELSE] ( -- )
  1 begin
    begin bl word count dup while                    \ level adr len
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
    refill 0= until
  drop
; immediate

: [IF] ( boolean -- )
   0= if postpone [ELSE] then
; immediate

: [THEN] ( -- ) ; immediate
