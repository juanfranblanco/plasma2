import { List } from "immutable"
import { key } from "@graphene/ecc"
import LocalStoragePersistence from "./LocalStoragePersistence"

/**
    Cache (for performance) for legacy addresses used for BTS 1.0 shorts and balance claims
*/
export default class AddressIndex {
    
    constructor() {
        this.storage = new LocalStoragePersistence("AddressIndex", true)
    }
    
    /**
        @arg {List<string>} ["pubkey1", ...]
        @return {Map<string, string>} - { "address": "public_key" } 
    */
    add( pubkeys ) {
        let addresses = this.storage.getState()
        List(pubkeys).forEach( pubkey => {
            if( addresses.has(pubkey))
                return
            
            var address_array = key.addresses(pubkey)// S L O W
            addresses = addresses.set(pubkey, List(address_array))
        })
        // console.log("AddressIndex loaded", addresses.size)
        this.storage.setState( addresses )
    }
    
    getPublicKey( address ) {
        let array = this.storage.state
            .findEntry( addresses => addresses.includes(address))
        
        return array ? array[0] : null
    }
    
}