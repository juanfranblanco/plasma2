import { Aes, PublicKey, PrivateKey, Signature, hash } from "@graphene/ecc"
import WalletSyncStorage from "./WalletSyncStorage"
import secureRandom from "secure-random"
import assert from "assert"
import lzma from "lzma"

/** Combines local storage and remote APIs to offer high-level functionality.  Unless documented otherwise, functions in this class return a promise.
*/
export default class WalletSyncActions {
    
    constructor(api, reducer) {
        this.storage = new WalletSyncStorage(reducer)
        this.api = api
    }
    
    emailCode(email) {
        return this.api.requestCode(email)
            .then( json => this.storage.setEmail(email, json.expire_min) )
    }
    
    validateCode(code) { this.storage.validateCode(code) }
    unlock(password) { this.storage.unlock(password) }
    lock() { this.storage.lock() }
    isLocked() { return this.storage.isLocked() }
    
    /** Saves or create the wallet on the remote wallet service.  This wallet must have a valid email and be unlocked.
        @arg {object} wallet_object
        @return {Promise} InternalError("Call validateCode first") | InternalError("Wallet locked")
    */
    put(wallet_object) { return new Promise( resolve => {
        if( typeof wallet_object !== 'object' ) throw new TypeError("wallet_object")
        if( ! this.storage.state.get("email_validated") ) throw new Error("validate_email")
        if( this.isLocked() ) throw new Error("wallet_locked")
        let created = this.storage.state.get("created")
        if( created != null ) {
            let expire = this.storage.state.get("code_expiration_date")
            if(Date.now() > new Date(expire).getTime()) throw new Error("email_code_expired")
        }
        var pubkey = this.storage.state.get("public_key")
        resolve( createWalletBackup(pubkey, wallet_object).then( encrypted_data => {
            // this.storage.private_key
            let local_hash_buffer = hash.sha256(encrypted_data)
            let private_key = this.storage.private_key
            let signature = Signature.signBufferSha256(local_hash_buffer, private_key)
            let local_hash = local_hash_buffer.toString('base64')
            if( created == null ) {
                let code = this.storage.state.get("code")
                return this.api.createWallet(code, encrypted_data, signature).then( json => {
                    this.storage.walletCreated(local_hash, json.created)
                    assert.equal(local_hash, json.local_hash, "unmatched local/server hash")
                })
            } else {
                let original_local_hash = this.storage.get("local_hash") 
                return this.api.saveWallet(code, encrypted_data, signature).then( json => {
                    this.storage.walletUpdated(local_hash, json.updated)
                    assert.equal(local_hash, json.local_hash, "unmatched local/server hash")
                })
            }
        }))
    })}
    
    get() { return new Promise( resolve => {
        if( ! this.storage.state.get("email_validated") ) throw new Error("validate_email")
        if( this.isLocked() ) throw new Error("wallet_locked")
        let local_hash = this.storage.state.get("local_hash")
        if( local_hash ) local_hash = new Buffer(local_hash, 'base64')
        let public_key = this.storage.state.get("public_key")
        resolve( this.api.fetchWallet(public_key, local_hash).then( json =>{
            let { status, statusText, updated, created, encrypted_data } = json
            if( statusText === "OK" ) {
                this.storage.walletFetched(local_hash, json.created, json.updated)
                let private_key = this.storage.private_key
                return decryptWalletBackup(private_key, new Buffer(encrypted_data, 'base64'))
            }
            throw { status, statusText }
        }))
    })}
    
    delete() { return new Promise( resolve => {
        if( this.isLocked() ) throw new Error("wallet_locked")
        let created = this.storage.state.get("created")
        if( created == null ) throw new Error("no_local_wallet")
        let local_hash = new Buffer(this.storage.state.get("local_hash"), 'base64')
        let private_key = this.storage.private_key
        let signature = Signature.signBufferSha256(local_hash, private_key)
        resolve( this.api.deleteWallet(local_hash, signature) )
    })}
    
    
}

function createWalletBackup(backup_pubkey, wallet_object) {
    let compression_mode = 9 
    let entropy = secureRandom.randomBuffer(32)
    return new Promise( resolve => {
        var public_key = PublicKey.fromPublicKeyString(backup_pubkey)
        // The onetime private is never saved, only the onetime public
        var onetime_private_key = PrivateKey.fromBuffer(entropy)
        var walletString = JSON.stringify(wallet_object, null, 0)
        lzma.compress(walletString, compression_mode, compressedWalletBytes => {
            var backup_buffer =
                Aes.encrypt_with_checksum(onetime_private_key, public_key,
                    null/*nonce*/, compressedWalletBytes)
            
            var onetime_public_key = onetime_private_key.toPublicKey()
            var backup = Buffer.concat([ onetime_public_key.toBuffer(), backup_buffer ])
            resolve(backup)
        })
    })
}

export function decryptWalletBackup(private_key, backup_buffer) {
    return new Promise( (resolve, reject) => {
        if( ! Buffer.isBuffer(backup_buffer))
            backup_buffer = new Buffer(backup_buffer, 'binary')
        
        var public_key
        try {
            public_key = PublicKey.fromBuffer(backup_buffer.slice(0, 33))
        } catch(e) {
            console.error(e, e.stack)
            throw new Error("Invalid backup file")
        }
        
        backup_buffer = backup_buffer.slice(33)
        try {
            backup_buffer = Aes.decrypt_with_checksum(
                private_key, public_key, null/*nonce*/, backup_buffer)
        } catch(error) {
            console.error("Error decrypting wallet", error, error.stack)
            reject("invalid_decryption_key")
            return
        }
        
        try {
            lzma.decompress(backup_buffer, wallet_string => {
                try {
                    var wallet_object = JSON.parse(wallet_string)
                    resolve(wallet_object)
                } catch(error) {
                    if( ! wallet_string) wallet_string = ""
                    console.error("Error parsing wallet json",
                        wallet_string.substring(0,10)+ "...")
                    reject("Error parsing wallet json")
                }
            })
        } catch(error) {
            console.error("Error decompressing wallet", error, error.stack)
            reject("Error decompressing wallet")
            return
        }
    })
}
