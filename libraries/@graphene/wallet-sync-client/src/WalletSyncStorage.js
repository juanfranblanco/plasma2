
import {List, Map} from "immutable"
import {createToken} from "@graphene/time-token"
import {Signature, PrivateKey, Aes} from "@graphene/ecc"
import hash from "@graphene/hash"
import WalletSyncApi, {invalidEmail} from "../src/WalletSyncApi"

/** Serilizable persistent state (strings).. The order generally reflects the actual work-flow order. */
const inital_persistent_state = Map({
    email: null,
    code_expiration_date: null,
    email_validated: false,
    public_key: null,
    local_hash: null,
    created: null,
    updated: null
})

/** Serilizable to object type */
function toObject(k, v) {
    switch(k) {
        case "code_expiration_date" : return new Date(v)
        case "public_key" : return PublicKey.fromString(v)
        case "local_hash" : return new Buffer(v, "base64")
        case "created" : return new Date(v)
        case "updated" : return new Date(v)
        default: return v
    }
}

/**
    Interacts with a remote wallet storage service.  This class also manages wallet synchronization state via pluggable storage (state_reducer).  Unless documented otherwise, methods return `undefined` when successful.
*/
export default class WalletSyncStorage {
    
    /**
        @arg {function} state_reducer - returns merged state after accepting partial state object updates.  When called with an undefined argument, if available, prior persisted state should be returned.
    */
    constructor(state_reducer) {
        this.private_key = null
        this.state_reducer = state_reducer
        this.state = state_reducer() || inital_persistent_state
    }
    
    reset() {
        this.private_key = null
        this.state = this.state_reducer(inital_persistent_state)
    }
    
    /** Save email and code expiration time {@link WalletSyncApi.requestCode()}.
        @arg {string} email
        @arg {number} code_expiration_min - minutes until code expires (example: 10)
        @throws [ TypeError("code_expiration_min"|"invalid_email") | InternalError("Delete this wallet first") ]
    */
    setEmail(email, code_expiration_min) {
        email = email ? email.trim() : email
        if( invalidEmail(email) ) throw new TypeError( "invalid_email" )
        if( typeof code_expiration_min !== "number" ) throw new TypeError("code_expiration_min "+typeof(code_expiration_min))
        if( this.state.get("created") ) throw new InternalError("Delete this wallet first")
        if( this.private_key && email.toLowerCase() !== this.state.get("email").toLowerCase() ) this.lock()
        let code_expiration_date = new Date(Date.now()+code_expiration_min*60*1000)
        this.state = this.state_reducer({ email, code_expiration_date })
    }
    
    /**
        @arg {string} code - base58 code from the wallet service {@link @graphene/time-token} emailed to user
        @throws [ TypeError("code") | InternalError("Call setEmail first") ]
        @return [ undefined | "invalid_code" ]
    */
    validateEmail(code) {
        if( ! code ) throw TypeError("code")
        let email = this.state.get("email")
        if( ! email ) throw new InternalError("Call setEmail first")
        let seed = extractSeed(code)
        if( ! seed ) return "invalid_code"
        if( ! seed === hash.sha1(email.toLowerCase(), 'binary') ) return "invalid_code"
        this.state = this.state_reducer({ email_validated: true, code_expiration_date: null })
    }
    
    /** 
        @arg {object} wallet_object
        @returns 
        @throws InternalError("Call validateEmail first") | InternalError("Wallet locked")
    */
    createEncryptedBackup(wallet_object) {
        if( typeof wallet_object !== 'object' ) throw new TypeError("wallet_object")
        if( ! this.state.get("email_validated") ) throw new InternalError("Call validateEmail first")
        
    }
    
    /**
        Unlock the wallet in RAM.  An email must be provided first (it is a salt value).  The first unlock causes the password public key to get saved; therefore future unlocks could return a "invalid_password" error.
        @arg {string} password
        @return [ undefined | "password_required" | "missing_email" | "invalid_password" ]
    */
    unlock(password) {
        if( ! password ) return "password_required"
        let email = this.state.get("email")
        if( ! email ) return "missing_email"
        let private_key = PrivateKey.fromSeed( email.toLowerCase() + password )
        let public_key = private_key.toPublicKey()
        if( this.state.get("public_key") ) {
            if( this.state.get("public_key") !== public_key.toString())
                return "invalid_password"
        } else {
            this.state = this.state_reducer({ public_key: public_key.toString() })
        }
        this.private_key = private_key
    }
    
    /** Removes the password private key from RAM.  There is no chance of error. */
    lock() { this.private_key = null }
    
    /** @return {boolean} */
    isLocked() { return this.private_key != null }
    

}

