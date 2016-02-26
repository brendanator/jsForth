var request = require("request");
var url = require("url");
var fs = require("fs");
var InputExceptions = require("./input-exceptions.js");

function Include(f) {
    f.defjs("include", function() {
        var outputCallback = f.outputCallback;

        var file = f._readWord();
        if (process.browser || file.match(/^http/)) {
            if (process.browser) file = url.resolve(location.href, file);
            request.get(file, function(error, response, body) {
                if (!error && response.statusCode == 200) {
                    f.run(body, outputCallback, file.toString());
                } else {
                    console.error("Failed to load http file " + file + ". " + error);
                }
            });
        } else {
            fs.readFile(file, "utf8", function(error, body) {
                if (!error) {
                    f.run(body, outputCallback, file);
                } else {
                    console.error("Failed to load file " + file + ". " + error);
                }
            });
        }
        throw InputExceptions.WaitingOnInput;
    });

    return f;
}

module.exports = Include;