


/** @deprecated see Wallet.js
*/

import {List, Map} from "immutable"
import {createToken, extractSeed} from "@graphene/time-token"
import {Signature, PrivateKey, Aes, hash} from "@graphene/ecc"
import WalletApi, {invalidEmail} from "../src/WalletApi"

/** Serilizable persisterent state (strings).. The order generally reflects the actual work-flow order. */
const inital_persisterent_state = Map({
    url: null,
    email: null,
    code_expiration_date: null,
    code: null,
    email_validated: false,
    public_key: null,
    local_hash: null,
    created: null,
    updated: null
})

/**
    This class is like your database constraints and triggers.  All the validation happens to ensure a consistent state.  All state non-sensitive transactions are passed through a pluggable persister object which may or may not store the information to disk.  
    
    Unless documented otherwise, methods return `undefined` when successful.
*/
export default class WalletState {
    
    /**
        @arg {function} persister - returns merged state after accepting partial state object updates.  When called with an undefined argument, if available, prior persistered state should be returned.  This object may or may not store the information to disk.
    */
    constructor(persister) {
        this.private_key = null
        this.persister = persister
        // load from disk or provide an initial state
        this.state = persister() || inital_persisterent_state
    }
    
    /**
        Reset memory and persistent storage to internal initial state.
    */
    reset() {
        this.private_key = null
        this.state = this.persister(inital_persisterent_state)
    }
    
    /**
        @arg {string} [ url = null] - Add or remove a wallet server url
    */
    setUrl(url) {
        this.state = this.persister({ url })
    }
    
    /** Save email and code expiration time {@link WalletApi.requestCode()}.
        @arg {string} email
        @arg {number} code_expiration_min - minutes until code expires (example: 10)
        @throws [ TypeError("code_expiration_min"|"invalid_email") | Error("Delete this wallet first") ]
    */
    setEmail(email, code_expiration_min) {
        email = email ? email.trim() : email
        if( invalidEmail(email) ) throw new TypeError( "invalid_email" )
        if( typeof code_expiration_min !== "number" ) throw new TypeError("code_expiration_min")
        if( this.state.get("created") ) throw new Error("Delete this wallet first")
        if( this.private_key && email.toLowerCase() !== this.state.get("email").toLowerCase() ) this.lock()
        let code_expiration_date = new Date(Date.now()+code_expiration_min*60*1000)
        this.state = this.persister({ email, code_expiration_date })
    }
    
    /**
        @arg {string} code - base58 code from the wallet service {@link @graphene/time-token} emailed to user
        @throws [ TypeError("invalid_code(n)") | Error("missing_email") ]
    */
    validateCode(code) {
        if( ! code ) throw TypeError("invalid_code (1)")
        let email = this.state.get("email")
        if( ! email ) throw new Error("missing_email")
        let seed = extractSeed(code)
        if( ! seed ) throw TypeError("invalid_code (2)")
        if( ! seed === hash.sha1(email.toLowerCase(), 'binary') ) throw TypeError("invalid_code (3)")
        this.state = this.persister({ email_validated: true, code, code_expiration_date: null })
    }
    
    /**
        Unlock the wallet in RAM.  An email must be provided first (it is a salt value).  The first unlock causes the password public key to get saved; therefore future unlocks could throw an "invalid_password" error.
        
        @arg {string} email - case-insensitive (must match token)
        @arg {string} username - case-insensitive
        @arg {string} password
        @throws [ "password_required" | "missing_email" | "invalid_password" ]
    */
    unlock(email, username, password) {
        if( ! this.isLocked() ) return
        if( ! username ) throw new TypeError( "username_required" )
        if( ! password ) throw new TypeError( "password_required" )
        username = username.trim().toLowerCase()
        let email = this.state.get("email")
        if( ! email ) throw new Error( "missing_email" )
        let private_key = PrivateKey.fromSeed( username + email.toLowerCase() + password )
        let public_key = private_key.toPublicKey()
        if( this.state.get("public_key") ) {
            if( this.state.get("public_key") !== public_key.toString())
                throw new TypeError( "invalid_password" )
        } else {
            this.state = this.persister({ public_key: public_key.toString() })
        }
        this.private_key = private_key
    }
    
    /** Removes the password private key from RAM.  There is no chance of error. */
    lock() { this.private_key = null }
    
    /** @return {boolean} */
    isLocked() { return this.private_key == null }
    
    /** Call prior to {@link this.unlock} to change password.  
        @private - Instead Wallet should be used to keep the local and remote service in sync.
    */
    deleteLocalPassword() {
        this.state = this.persister({ public_key: null })
    }
    
    walletCreated(local_hash, created) {
        local_hash = toString(req(local_hash, 'local_hash'), 'base64')
        created = toString(req(created, 'created'))
        this.state = this.persister({ local_hash, created })
    }
    
    walletUpdated(local_hash, updated) {
        local_hash = toString(req(local_hash, 'local_hash'), 'base64')
        updated = toString(req(updated, 'updated'))
        this.state = this.persister({ local_hash, updated })
    }
    
    walletFetched(local_hash, created, updated) {
        local_hash = toString(req(local_hash, 'local_hash'), 'base64')
        created = toString(req(created, 'created'))
        updated = toString(req(updated, 'updated'))
        this.state = this.persister({ local_hash, created, updated })
    }

}

var toString = (data, encoding) => data == null ? data :
    data["toString"] ? data.toString(encoding) : data

function req(data, field_name) {
    if( data == null ) throw "Missing required field: " + field_name
    return data
}

// /** Serilizable to object type */
// function toObject(k, v) {
//     switch(k) {
//         case "code_expiration_date" : return new Date(v)
//         case "public_key" : return PublicKey.fromString(v)
//         case "local_hash" : return new Buffer(v, "base64")
//         case "created" : return new Date(v)
//         case "updated" : return new Date(v)
//         default: return v
//     }
// }