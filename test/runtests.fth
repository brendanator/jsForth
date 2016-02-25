\ ANS Forth tests - run all tests

\ Adjust the file paths as appropriate to your system
\ Select the appropriate test harness, either the simple tester.fr
\ or the more complex ttester.fs 

CR .( Running ANS Forth and Forth 2012 test programs, version 0.13) CR

\ include https://raw.githubusercontent.com/gerryjackson/forth2012-test-suite/master/src/prelimtest.fth
\ include https://raw.githubusercontent.com/gerryjackson/forth2012-test-suite/master/src/tester.fr
\ include https://raw.githubusercontent.com/gerryjackson/forth2012-test-suite/master/src/ttester.fs
include test/verbose-tester.fth

\ Dummy implementation so accept test runs in batch
: accept drop 0 swap ! 0 ;

include https://raw.githubusercontent.com/gerryjackson/forth2012-test-suite/master/src/core.fr
include https://raw.githubusercontent.com/gerryjackson/forth2012-test-suite/master/src/coreplustest.fth
\ include https://raw.githubusercontent.com/gerryjackson/forth2012-test-suite/master/src/utilities.fth
\ include https://raw.githubusercontent.com/gerryjackson/forth2012-test-suite/master/src/errorreport.fth
\ include https://raw.githubusercontent.com/gerryjackson/forth2012-test-suite/master/src/coreexttest.fth
\ include https://raw.githubusercontent.com/gerryjackson/forth2012-test-suite/master/src/blocktest.fth
\ include https://raw.githubusercontent.com/gerryjackson/forth2012-test-suite/master/src/doubletest.fth
\ include https://raw.githubusercontent.com/gerryjackson/forth2012-test-suite/master/src/exceptiontest.fth
\ include https://raw.githubusercontent.com/gerryjackson/forth2012-test-suite/master/src/facilitytest.fth
\ include https://raw.githubusercontent.com/gerryjackson/forth2012-test-suite/master/src/filetest.fth
\ include https://raw.githubusercontent.com/gerryjackson/forth2012-test-suite/master/src/localstest.fth
\ include https://raw.githubusercontent.com/gerryjackson/forth2012-test-suite/master/src/memorytest.fth
\ include https://raw.githubusercontent.com/gerryjackson/forth2012-test-suite/master/src/toolstest.fth
\ include https://raw.githubusercontent.com/gerryjackson/forth2012-test-suite/master/src/searchordertest.fth
\ include https://raw.githubusercontent.com/gerryjackson/forth2012-test-suite/master/src/stringtest.fth
\ REPORT-ERRORS

CR .( Forth tests completed ) CR CR

