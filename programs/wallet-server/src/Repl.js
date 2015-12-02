var repl = require("repl");
var repl_history = require("repl.history");
var replApi = require('./ReplApi')
var promisify = require("repl-promised").promisify

var repl_instance = repl.start({
    prompt: "Wallet-Server> ",
    input: process.stdin,
    output: process.stdout,
    ignoreUndefined: true
})
promisify( repl_instance )
for (var obj in replApi)
    repl_instance.context[obj] = replApi[obj]

repl_instance.on("exit", ()=> { })
var hist_file = process.env.HOME + "/.wallet_server_history";
repl_history(repl_instance, hist_file);