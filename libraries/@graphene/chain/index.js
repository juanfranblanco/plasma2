import { List } from "immutable"

module.exports = {
    config: require("./src/config"),
    Apis: require("./src/ApiInstances").default,
    ChainStore: require("./src/ChainStore"),
    
    /** 
    */
    fetchChain: (methodName, objectIds, timeout) => {
        
        let chainStore = require("./src/ChainStore")
        let ChainStore = chainStore.default
        let method = ChainStore[methodName]
        if( ! method ) throw new Error("ChainStore does not have method " + methodName)
        
        let arrayIn = Array.isArray(objectIds)
        if( ! arrayIn ) objectIds = [ objectIds ]
        
        return chainStore.FetchChainObjects(method, List(objectIds), timeout)
            .then( res => arrayIn ? res : res.get(0) )
    }
    
}