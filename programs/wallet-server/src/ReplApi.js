import * as WaterlineDb from "./WaterlineDb"
import createServer from "./server"

module.exports = {
    
    ontology: ()=>{ return module.exports.ontology },
    collections: ()=>{ return module.exports.ontology.collections },
    start: ()=>{
        if( global.server ) global.server.close() 
        global.server = createServer()
    } 
    
}

WaterlineDb.instance( ontology =>{ module.exports.ontology = ontology })