import crypto from "crypto"
import Waterline from "waterline"
import connections from "../config/connections"

// const adapter = "sails-memory"
const adapter = "sails-mysql"
var sailsDbAdapter = require(adapter)

export function close(resolve) {
    sailsDbAdapter.teardown(null, resolve)
    global.waterline_ontology = null
}

export function instance(resolve) {
    if( global.waterline_ontology) {
        resolve( global.waterline_ontology )
        return
    }
    var waterline = new Waterline()
    var index = true, required = true, unique = true, string='string', binary='binary'     
    var walletCollection = Waterline.Collection.extend({
        identity: "wallet", connection: 'default', adapter,
        attributes: {
            email: { type: string, required, unique, index },
            // pubkey: { type: 'binary', required, unique, index },
            // encrypted_data: { type: 'binary', required },
            // signature: { type: 'binary', required },
            // hash_sha1: { type: 'binary', required, size: 20 }
        }
    })
    waterline.loadCollection(walletCollection)
    var waterlineConfig = { adapters: { }, connections }
    waterlineConfig.connections.default = { adapter }
    waterlineConfig.adapters[adapter] = sailsDbAdapter
    waterline.initialize(waterlineConfig, (err, ontology) => {
        if (err) { console.error(err); return }
        resolve( global.waterline_ontology = ontology )
    })
}




