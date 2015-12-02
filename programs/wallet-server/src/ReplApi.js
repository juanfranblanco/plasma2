import repl from "repl"
import repl_history from "repl.history"
import { promisify} from "repl-promised"
import * as WaterlineDb from "./WaterlineDb"
import createServer from "./server"

module.exports = {
    
    ontology: ()=>{ return global.ontology },
    collections: ()=>{ return global.ontology.collections },
    start: done =>{
        if( global.server ) {
            module.exports.stop(_done =>{ module.exports.start(done) })
            return
        } 
        global.server = createServer().server
        WaterlineDb.instance( ontology =>{
            global.ontology = ontology
            if( done ) done()
        })
    },
    stop: done =>{
        if( global.server ) {
            global.server.close()
            global.server = null
        }
        WaterlineDb.close( ()=>{ if( done ) done() })
    },
    cli: done =>{
        var repl_instance = repl.start({
            prompt: "Wallet-Server> ",
            input: process.stdin,
            output: process.stdout,
            ignoreUndefined: true
        })
        promisify( repl_instance )
        for (var obj in module.exports)
            repl_instance.context[obj] = module.exports[obj]

        repl_instance.on("exit", ()=>{ module.exports.stop() })
        var hist_file = process.env.HOME + "/.wallet_server_history";
        repl_history(repl_instance, hist_file);
        module.exports.start( done )
    }
}

