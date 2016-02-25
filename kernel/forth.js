var Data = require("./data.js");
var Definitions = require("./definitions.js");
var NumericOperations = require("./numeric-operations.js");
var BooleanOperations = require("./boolean-operations.js");
var StackOperations = require("./stack-operations.js");
var MemoryOperations = require("./memory-operations.js");
var ControlStructures = require("./control-structures.js");
var JsInterop = require("./js-interop.js");
var Input = require("./input.js");
var Output = require("./output.js");
var Include = require("./include.js");
var Interpreter = require("./interpreter.js");

function Forth() {
    var forth = {};

    Data(forth);
    Definitions(forth);
    Input(forth);
    NumericOperations(forth);
    BooleanOperations(forth);
    StackOperations(forth);
    MemoryOperations(forth);
    ControlStructures(forth);
    Output(forth);
    JsInterop(forth);
    Include(forth);
    Interpreter(forth);

    return forth;
}

module.exports = Forth;