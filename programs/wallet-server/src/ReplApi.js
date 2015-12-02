import * as WaterlineDb from "./WaterlineDb"
import createServer from "./server"

module.exports = {
    
    ontology: ()=>{ return global.ontology },
    collections: ()=>{ return global.ontology.collections },
    start: done =>{
        if( global.server ) {
            this.stop(_done =>{ this.start(done) })
            return
        } 
        global.server = createServer().server
        WaterlineDb.instance( ontology =>{
            global.ontology = ontology
            if( done ) done()
        })
    },
    stop: done => {
        if( global.server ) {
            global.server.close()
            global.server = null
        }
        WaterlineDb.close( ()=>{ if( done ) done() })
    }
}

