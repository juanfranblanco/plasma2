import assert from "assert"
import walletFetch from "./fetch"

/** A protocol between the web browser and the server for storing and retrieving data.  Unless documented otherwise, all methods return a Promise (future) that will resolve on success or reject on error.

    @see [Wallet Server Architecture]{@link https://github.com/cryptonomex/graphene/wiki/Wallet-Server-Architecture}
*/
export default class WalletApi {
    
    constructor(remote_url) {
        if( typeof remote_url !== 'string' ) throw Error("remote_url required")
        this.remote_url = remote_url
    }

    /**
        Email an authorization code for use in {@link createWallet}.  The code will expire after a period of time.
        ```bash
        curl http://localhost:9080/requestCode?email=alice@example.com
        ```
        @arg {string} email
        @return {Promise} object { status: 200, statusText: "OK", expire_min: 10 }
    */
    requestCode(email) {
        if( invalidEmail(email) ) throw ["invalid email", email]
        let action = { type: "requestCode", email }
        return walletFetch(this.remote_url, action)
            .then( res => res.json() ).then( json => {
            assertRes(json, "OK")
            let { status, statusText, expire_min } = json
            assert(expire_min, 'expire_min')
            return { status, statusText, expire_min }
        })
    }

    /** 
        Create or save a wallet on the server.  The wallet will be saved on the server using the public_key derived from encrypted_data and signature.  This public key will be derived from the password but should additionally be seeded with the email address.
     
        @arg {string} code - from {@link requestCode}
        @arg {string} encrypted_data - base64 string
        @arg {string} signature - base64 string
        @return {Promise} object - {
            status: 200, statusText: "OK",
            local_hash: "base64 string sha256(encrypted_data)",
            created: "{Date}"
        }
     */
    createWallet(code, encrypted_data, signature) {
        encrypted_data = toBinary(req(encrypted_data, 'encrypted_data'))
        signature = toBinary(req(signature, 'signature'))
        let action = { type: "createWallet", code, encrypted_data, signature }
        return walletFetch(this.remote_url, action).then( res => res.json() ).then( json => {
            assertRes(json, "OK", json)
            let { status, statusText, created, local_hash, error } = json
            if( ! error ) {
                assert(local_hash, 'local_hash')
                assert(created, 'created')
            }
            return { status, statusText, created, local_hash, error }
        })
    }

    /** @arg {string} public_key - derived from {@link createWallet.signature}
        @arg {Buffer|string} [local_hash = null] - binary sha256 of {@link createWallet.encrypted_data} optional and used to determine if data should be returned or if the server's wallet is identical to the client's wallet.
        @return {Promise} {
            status: 200, statusText: "OK",
            encrypted_data: "base64 string encrypted_data",
            created: "{Date}",
            updated: "{Date}"
        } || {status: 304, statusText: "Not Modified" }
    */
    fetchWallet(public_key, local_hash) {
        public_key = toString(req(public_key, 'public_key'))
        local_hash = toBinary(local_hash)
        let action = { type: "fetchWallet", public_key, local_hash }
        return walletFetch(this.remote_url, action)
            .then( res => /No Content|Not Modified/.test(res.statusText) ? res : res.json() )
            .then( json => {
            let { status, statusText, updated, created, local_hash, encrypted_data } = json
            assert(/OK|No Content|Not Modified/.test(statusText), '/OK|No Content|Not Modified/.test(statusText)')
            if(statusText === "OK") {
                assert(encrypted_data, 'encrypted_data')
                assert(local_hash, 'local_hash')
                assert(created, 'created')
                assert(updated, 'updated')
                return {status, statusText, updated, created, local_hash, encrypted_data}
            }
            return {status, statusText}
        })
    }

    /** 
        @arg {Buffer|string} original_local_hash - binary hash of the wallet being replaced.  A bad request will occure if this does not match.
        @arg {Buffer|string} encrypted_data - binary
        @arg {Signature|string} signature - binary
        @return {Promise} { local_hash: "base64 sha256 encrypted_data",
            updated: {Date}, status: 200, statusText: "OK" }
    */
    saveWallet(original_local_hash, encrypted_data, signature) {
        original_local_hash = toBinary(req(original_local_hash, 'original_local_hash'))
        encrypted_data = toBinary(req(encrypted_data, 'encrypted_data'))
        signature = toBinary(req(signature, 'signature'))
        let action = { type: "saveWallet", original_local_hash, encrypted_data, signature }
        return walletFetch(this.remote_url, action).then( res => assertRes(res, "OK", res).json() )
            .then( json => {
            let { status, statusText, updated, local_hash } = json
            assert(local_hash, 'local_hash')
            assert(updated, 'updated')
            return { status, statusText, updated, local_hash }
        })
    }

    /** After this call the public key used to lookup this wallet will be the one derived from new_signature and encrypted_data. A wallet must exist at the old_public_key derived from old_signature.

        @arg {Object} param - Values from API call
        @arg {string} param.encrypted_data - base64
        @arg {string} param.old_signature - base64
        @arg {string} param.new_signature - base64
        @return {Promise} {status: 200, statusText: "OK", updated: "{Date}", local_hash}
    */
    changePassword(original_local_hash, original_signature, new_encrypted_data, new_signature) {
        original_local_hash = toBinary(req(original_local_hash, 'original_local_hash'))
        original_signature = toBinary(req(original_signature, 'original_signature'))
        new_encrypted_data = toBinary(req(new_encrypted_data, 'new_encrypted_data'))
        new_signature = toBinary(req(new_signature, 'new_signature'))
        let action = { type: "changePassword", original_local_hash, original_signature, new_encrypted_data, new_signature }
        return walletFetch(this.remote_url, action).then( res => assertRes(res, "OK").json() )
            .then( json => {
            let { status, statusText, updated, local_hash } = json
            assert(updated, 'updated')
            assert(local_hash, 'local_hash')
            return {status, statusText, updated, local_hash}
        })
    }

    /** Permanently remove a wallet.
        @arg {string} deleteWallet.local_hash - base64 sha256 encrypted_data
        @arg {string} deleteWallet.signature - base64
        @return {Promise} resolve (successful) or cache (error) 
    */
    deleteWallet(local_hash, signature) {
        local_hash = toBinary(req(local_hash, 'local_hash'))
        signature = toBinary(req(signature, 'signature'))
        let action = { type: "deleteWallet", local_hash, signature }
        return walletFetch(this.remote_url, action)
            .then(res => assertRes(res, "OK" ))
            .then( json => { return {status: 200, statusText: "OK"} })
    }
}

/** @typedef Date - ISO 8601 as returned by `new Date().toISOString()` and read by `new Date(...)`.
    Example: 2015-11-11T19:43:58.181Z
    @type {string}
*/

// No spaces, only one @ symbol, any character for the email name (not completely complient but safe),
// only valid domain name characters...  Single letter domain is allowed, top level domain has at
// least 2 characters.
export var invalidEmail = email => ! email || ! /^[^ ^@.]+@[a-z0-9][\.a-z0-9_-]*\.[a-z0-9]{2,}$/i.test( email )

// @return {string} binary
var toBinary = data => data == null ? data :
    Buffer.isBuffer(data) ? data.toString('binary') :
    data["toBuffer"] ? data.toBuffer().toString('binary') : data

// 
// var toBuffer = data => data == null ? data :
//     typeof(data) === 'string' ? new Buffer(data, 'binary') :
//     data["toBuffer"] ? data.toBuffer() : data
// 
// var toBase64 = data => data == null ? data :
//     data["toBuffer"] ? data.toBuffer().toString('base64') :
//     Buffer.isBuffer(data) ? data.toString('base64') : data

var toString = data => data == null ? data :
    data["toString"] ? data.toString() : data // PublicKey.toString()

// required
function req(data, field_name) {
    if( data == null ) throw "Missing required field: " + field_name
    return data
}

function assertRes(res, statusText, cause) {
    try { assert.equal(res.statusText, statusText) }
        catch(unexpected_response) {
            // console.log("res", res)
            throw { unexpected_response, cause, res: {
                status: res.status, // HTTP Status Code
                statusText: res.statusText // HTTP Status Text (matching Code)
            }}
        }
    return res
}