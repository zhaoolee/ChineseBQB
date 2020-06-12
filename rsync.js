const Rsync = require('rsync');

const path = require('path');

// Build the command
var rsync = new Rsync()
    .shell('ssh')
    .flags({
        'a': true,
        'z': true,
        'v': true,
    })
    .delete()
    .progress()
    .compress()
    .exclude([".*/", "up.js"])
    .output(
        function(data){
            // do things like parse progress
            console.log("=传输数据=>>", data.toString());
        }, function(data) {
            // do things like parse error output
            console.log("=数据传输报错=>>", data.toString());
        }
    )
    
    .source(path.join(__dirname, "..", "ChineseBQB"))
    .destination('root@v2fy.com:/usr/share/nginx/v2fy.com/asset/0i');

// Execute the command
rsync.execute(function (error, code, cmd) {
    console.log("error", error);
    console.log("code", code);
    console.log("cmd", cmd);
});