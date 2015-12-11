// // import { List, Map, fromJS } from 'immutable'
// import {Wallet} from "../src/db/models.js"
// import replApi from "../src/ReplApi"
import {createToken} from '@graphene/time-token'
import {Signature, PrivateKey, Aes} from "@graphene/ecc"
import hash from "@graphene/hash"
import assert from "assert"
import fetch from "node-fetch"
import FormData from "form-data"
import bs58 from "bs58"

/** Clients may use this to make network API requests to the server */
export default class WalletSyncNetworkLayer {
    
    /**
        @arg {string} host
        @arg {number} port
    */
    constructor(host, port) {
        this.host = host
        this.port = port
    }
    
    /**
        @arg {object} action - Action obtained from {@link ./WalletSyncApi.js}
        @return {Promise} object - JSON or Text
    */
    fetch(action) {
        let type = action.type
        if( ! type ) throw new Error("Action parameter missing action.type (see ./WalletSyncApi.js")
        let body = new FormData()
        for(let f in action) {
            if( f === 'type' ) continue
            body.append(f, action[f])
        }
        return fetch(
            "http://" + this.host + ":" + this.port + "/" + type,
            { method: 'POST', body })
            .then( res => { try {return res.json()} catch(e) { return res.text() } })
            .catch( error =>{ console.error("WalletSyncNetworkLayer", error); throw error })
    }

    // /**
    //     @arg {string_bs58|Buffer} code
    //     @arg {string_base64|Buffer|Signature} signature 
    //     @arg {string_binary|Buffer} encrypted_data
    //     
    // */
    // createWallet(code, signature, encrypted_data) {
    //     let body = new FormData()
    //     body.append('code', Buffer.isBuffer(code) ? code : bs58.encode(code))
    //     body.append('signature', signatureToBuffer(signature))
    //     body.append('encrypted_data', Buffer.isBuffer(encrypted_data) ? encrypted_data : new Buffer(encrypted_data, 'binary'))
    //     return fetch(
    //         "http://" + this.host + ":" + this.port + `/createWallet`,
    //         { method: 'POST', body })
    //         .then( res => {
    //             assert.equal("OK", res.statusText)
    //             assert.equal(200, res.status)
    //             assert.equal(true, res.ok)
    //             return res.json()
    //         })
    //         .then( json => {
    //             assert.equal("OK", json.code_description, json)
    //             assert.equal(200, json.code, json)
    //             assert(json.local_hash != null, 'missing local_hash')
    //             return {code: 200, code_description: "OK", local_hash: json.local_hash }
    //         })
    //         .catch( error =>{ console.error(error); throw error })
    // )
    // 
    // /**
    //     @arg {string} pubkey - like GPH839JpDChDinGGgqqcRXzoepBbBF3BEycgLpXo51jA3WTjsLCc8
    //     @arg {string} local_hash_base64 - sha256(encrypted_data)
    //     @return {Promise} - null if the server's wallet local_hash is the same, or return:
    //         {code:200, code_description:"OK", encrypted_data: "binary buffer"}
    // */
    // fetchWallet(pubkey, local_hash_base64) {
    //     let body = new FormData()
    //     body.append('public_key', pubkey)
    //     body.append('local_hash', local_hash_base64)
    //     fetch("http://" + this.host + ":" + this.port + "/fetchWallet")
    //         .then( res => {
    //             if(res.statusText === "Not Modified") return null
    //             assert.equal("OK", res.statusText)
    //             assert.equal(200, res.status)
    //             return res.json()
    //         }).
    //         then( json => {
    //             assert.equal("OK", json.code_description)
    //             assert.equal(200, json.code)
    //             assert.equal(public_key, json.public_key)
    //             assert.equal(130, json.signature.length)
    //             assert(json.local_hash)
    //             assert(json.encrypted_data)
    //             return {
    //                 code:200, code_description:"OK",
    //                 encrypted_data: new Buffer(json.encrypted_data, 'binary')
    //             }
    //         }).catch( error =>{ console.error(error, error.stack); throw error })
    // }
    // 
    // /**
    // 
    // */
    // saveWallet(original_local_hash_base64, signature_base64, encrypted_data_binbuffer) {
    //     let original_local_hash = hash.sha256(Aes.fromSeed("").encrypt("data"), 'base64')
    //     let private_key = PrivateKey.fromSeed("")
    //     let encrypted_data = Aes.fromSeed("").encrypt("data2")
    //     let signature = Signature.signBuffer(encrypted_data, private_key)
    //     let body = new FormData()
    //     body.append('original_local_hash', original_local_hash)
    //     body.append('signature', signature.toHex())
    //     body.append('encrypted_data', encrypted_data.toString('binary'))
    //     fetch(
    //         "http://" + this.host + ":" + this.port + `/saveWallet`,
    //         { method: 'POST', body })
    //         .then( res => {
    //             assert.equal("OK", res.statusText)
    //             assert.equal(200, res.status)
    //             done()
    //         })
    //         .catch( error =>{ console.error(error); throw error })
    // }
    // 
    // saveWallet (conflict)() {
    //     let original_local_hash = hash.sha256(Aes.fromSeed("").encrypt("conflict"), 'base64')
    //     let private_key = PrivateKey.fromSeed("")
    //     let encrypted_data = Aes.fromSeed("").encrypt("data2")
    //     let signature = Signature.signBuffer(encrypted_data, private_key)
    //     let body = new FormData()
    //     body.append('original_local_hash', original_local_hash)
    //     body.append('signature', signature.toHex())
    //     body.append('encrypted_data', encrypted_data.toString('binary'))
    //     fetch(
    //         "http://" + this.host + ":" + this.port + `/saveWallet`,
    //         { method: 'POST', body })
    //         .then( res => {
    //             assert.equal("Conflict", res.statusText)
    //             assert.equal(409, res.status)
    //             done()
    //         })
    //         .catch( error =>{ console.error(error); throw error })
    // }
    // 
    // fetchWallet (newly saved)() {
    //     let public_key = PrivateKey.fromSeed("").toPublicKey().toString()
    //     let encrypted_data = Aes.fromSeed("").encrypt("data2")
    //     let local_hash = hash.sha256(encrypted_data, 'base64')
    //     fetch("http://" + this.host + ":" + this.port + `/fetchWallet?public_key=${public_key}&local_hash=${local_hash}`)
    //         .then( res => {
    //             assert.equal("Not Modified", res.statusText)
    //             assert.equal(304, res.status)
    //             done()
    //         }).catch( error =>{ console.error(error, error.stack); throw error })
    // }
    // 
    // saveWallet (unknown key)() {
    //     // change "nobody" to "" and it should pass (should match createWallet's private key)
    //     var private_key = PrivateKey.fromSeed("nobody")
    //     let encrypted_data = Aes.fromSeed("").encrypt("data2")
    //     let signature = Signature.signBuffer(encrypted_data, private_key)
    //     let body = new FormData()
    //     body.append('signature', signature.toHex())
    //     body.append('encrypted_data', encrypted_data.toString('binary'))
    //     fetch(
    //         "http://" + this.host + ":" + this.port + `/saveWallet`,
    //         { method: 'POST', body })
    //         .then( res => {
    //             assert.equal("Bad Request", res.statusText)
    //             assert.equal(400, res.status)
    //             done()
    //         })
    //         .catch( error =>{ console.error(error); throw error })
    // }
    // 
    // changePassword() {
    //     let private_key =  PrivateKey.fromSeed("")
    //     let encrypted_data = Aes.fromSeed("").encrypt("data2")
    //     let local_hash = hash.sha256(encrypted_data)
    //     let signature = Signature.signBufferSha256(local_hash, private_key)
    //     let update = {
    //         private_key: PrivateKey.fromSeed("2"),
    //         encrypted_data: Aes.fromSeed("2").encrypt("data2"),
    //         signature: Signature.signBuffer(encrypted_data, private_key)
    //     }
    //     let body = new FormData()
    //     body.append('original_local_hash', local_hash.toString('hex'))
    //     body.append('original_signature', signature.toHex())
    //     body.append('new_encrypted_data', update.encrypted_data.toString('binary'))
    //     body.append('new_signature', update.signature.toHex())
    //     fetch(
    //         "http://" + this.host + ":" + this.port + `/changePassword`,
    //         { method: 'POST', body })
    //         .then( res => {
    //             assert.equal("OK", res.statusText, res.text())
    //             assert.equal(200, res.status)
    //             done()
    //         })
    //         .catch( error =>{ console.error(error); throw error })
    // }
    // 
    // fetchWallet (new password)() {
    //     let public_key = PrivateKey.fromSeed("2").toPublicKey().toString()
    //     let encrypted_data = Aes.fromSeed("2").encrypt("data2")
    //     let local_hash = hash.sha256(encrypted_data, 'base64')
    //     fetch("http://" + this.host + ":" + this.port + `/fetchWallet?public_key=${public_key}&local_hash=${local_hash}`)
    //         .then( res => {
    //             assert.equal("Not Modified", res.statusText)
    //             assert.equal(304, res.status)
    //             done()
    //         }).catch( error =>{ console.error(error, error.stack); throw error })
    // }
    // 
    // deleteWallet(){
    //     let private_key = PrivateKey.fromSeed("2")
    //     let encrypted_data = Aes.fromSeed("2").encrypt("data2")
    //     let local_hash = hash.sha256(encrypted_data)
    //     let sig = Signature.signBufferSha256(local_hash, private_key)
    //     let body = new FormData()
    //     body.append('local_hash', local_hash.toString('base64'))
    //     body.append('signature', sig.toHex())
    //     fetch(
    //         "http://" + this.host + ":" + this.port + `/deleteWallet`,
    //         { method: 'POST', body })
    //         .then( res => {
    //             assert.equal(res.statusText, "OK")
    //             assert.equal(res.status, 200)
    //             done()
    //         })
    //         .catch( error =>{ console.error(error); throw error })
    // }
}

function signatureToBuffer(signature) {
    if( Buffer.isBuffer(signature)) return signature
    if( signature["toBuffer"] ) return signature.toBuffer()
    if( typeof signature === 'string') return new Buffer(signature, 'base64')
}