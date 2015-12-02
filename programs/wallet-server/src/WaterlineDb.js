import crypto from "crypto"
import Waterline from "waterline"

const adapter = "memory"; var connections = {}
// const adapter = "mysql"; import {connections} from "../config/connections";

connections.default = { adapter }
var sailsDbAdapter = require("sails-" + adapter)

export function close(resolve) {
    sailsDbAdapter.teardown(null, resolve)
    global.waterline_ontology = null
}

export function instance(ontology) {
    if( global.waterline_ontology) {
        ontology( global.waterline_ontology )
        return
    }
    var waterline = new Waterline()
    var index = true, required = true, unique = true, string='string', binary='binary'     
    var walletCollection = Waterline.Collection.extend({
        identity: "wallet", connection: 'default', adapter,
        attributes: {
            email: { type: string, required},//, unique, index },
            pubkey: { type: 'binary', required},//, unique, index },
            encrypted_data: { type: 'binary', required },
            signature: { type: 'binary', required },
            hash_sha1: { type: 'binary', required, size: 20 }
        }
    })
    waterline.loadCollection(walletCollection)
    var waterlineConfig = { adapters: { }, connections }
    waterlineConfig.adapters[adapter] = sailsDbAdapter
    waterline.initialize(waterlineConfig, (err, _ontology) => {
        if (err) { console.error(err); return }
        ontology( global.waterline_ontology = _ontology )
    })
}




