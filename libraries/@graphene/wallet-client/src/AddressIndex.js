import { List } from "immutable"
import { key } from "@graphene/ecc"
import { chain_config } from "@graphene/chain"
import LocalStoragePersistence from "./LocalStoragePersistence"

/**
    Cache (for performance) for legacy addresses used for BTS 1.0 shorts and balance claims.
    
    Map<string, string> - { "address": "public_key" } 
*/
export default class AddressIndex {
    
    constructor() {
        this.storage = new LocalStoragePersistence("AddressIndex", true)
    }
    
    /**
        @arg {List<string>} ["pubkey1", ...]
        @return {Promise}
    */
    add( pubkeys ) {
        return new Promise( (resolve, reject) =>{
            let addresses = this.storage.getState()
            pubkeys = List(pubkeys).filterNot( pubkey => addresses.has(pubkey))
            this.indexing = true
            try {
                // much faster
                var AddressIndexWorker = require("worker!./AddressIndexWorker")
                var worker = new AddressIndexWorker
                // browser
                worker.postMessage({ pubkeys: pubkeys.toJS(), address_prefix: chain_config.address_prefix })
                worker.onmessage = event => {
                    try {
                        var key_addresses = event.data
                        addresses = addresses.withMutations( addresses => {
                            for(let i = 0; i < pubkeys.size; i++) {
                                var address_array = key_addresses[i]
                                addresses.set(pubkeys.get(i), List(address_array))
                            }
                            // console.log("AddressIndex loaded", addresses.size)
                            
                        })
                        this.indexing = false
                        this.storage.setState( addresses )
                        resolve()
                    } catch( e ) {
                        console.error('AddressIndex.add', e)
                        reject(e)
                    }
                }
            } catch( error ) {
                // nodejs
                pubkeys.forEach( pubkey => {
                    var address_array = key.addresses(pubkey)// S L O W
                    addresses = addresses.set(pubkey, List(address_array))
                })
                pubkeys = pubkeys.mutateIn
                this.storage.setState( addresses )
                this.indexing = false
                resolve()
            }
        })
    }
    
    getPublicKey( address ) {
        let array = this.storage.state
            .findEntry( addresses => addresses.includes(address))
        
        return array ? array[0] : null
    }
    
}