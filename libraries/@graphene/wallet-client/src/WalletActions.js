import { Aes, PublicKey, PrivateKey, Signature, hash } from "@graphene/ecc"
import secureRandom from "secure-random"
import assert from "assert"
import lzma from "lzma"

/**
    @return {Promise} {Buffer} binary_backup
*/
export function encrypt(wallet_object, backup_pubkey) {
    return new Promise( resolve => {
        let compression_mode = 9 
        let entropy = secureRandom.randomBuffer(32)
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

/**
    @return {Promise} {object} wallet_object
*/
export function decrypt(backup_buffer, private_key) {
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


/** Combines local storage and remote APIs to offer high-level functionality.  Unless documented otherwise, functions in this class return a promise.

@deprecated .. see Wallet.js instead
*/
// export default class WalletActions {
//     
//     constructor(api, persister) {
//         this.storage = new WalletState(persister)
//         this.api = api
//     }
//     
//     requestCode(email) {
//         return this.api.requestCode(email)
//             .then( json => this.storage.setEmail(email, json.expire_min) )
//     }
//     
//     validateCode(code) {
//         this.storage.validateCode(code)
//     }
//     
//     unlock(username, password) {
//         this.storage.unlock(username, password)
//     }
//     
//     lock() {
//         this.storage.lock()
//     }
//     
//     isLocked() { return this.storage.isLocked() }
//     
//     /** Saves or create the wallet on the remote wallet service.  This wallet must have a valid email and be unlocked.
//         @arg {object} wallet_object
//         @return {Promise} InternalError("Call validateCode first") | InternalError("Wallet locked")
//     */

//     
//     get() { return new Promise( resolve => {
//         if( ! this.storage.state.get("email_validated") )
//             throw new Error("validate_email")
//         
//         if( this.isLocked() )
//             throw new Error("login")
//         
//         let local_hash = this.storage.state.get("local_hash")
//         if( local_hash ) local_hash = new Buffer(local_hash, 'base64')
//         let public_key = this.storage.state.get("public_key")
//         resolve( this.api.fetchWallet(public_key, local_hash).then( json =>{
//             let { status, statusText, updated, local_hash, created, encrypted_data } = json
//             if( statusText === "OK" ) {
//                 this.storage.walletFetched(local_hash, json.created, json.updated)
//                 let private_key = this.storage.private_key
//                 return decryptWalletBackup(private_key, new Buffer(encrypted_data, 'base64'))
//             }
//             return { status, statusText }
//         }))
//     })}
//     
//     delete() { return new Promise( resolve => {
//         if( this.isLocked() )
//             throw new Error("login")
//         
//         let created = this.storage.state.get("created")
//         if( created == null )
//             throw new Error("no_local_wallet")
//         
//         let local_hash = new Buffer(this.storage.state.get("local_hash"), 'base64')
//         let private_key = this.storage.private_key
//         let signature = Signature.signBufferSha256(local_hash, private_key)
//         resolve( this.api.deleteWallet(local_hash, signature) )
//     })}
//     
//     
// }
