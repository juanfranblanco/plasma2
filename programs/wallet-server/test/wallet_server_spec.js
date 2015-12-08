// import { List, Map, fromJS } from 'immutable'
import assert from "assert"
import fetch from "node-fetch"
import FormData from "form-data"
import {createToken, checkToken} from '@graphene/time-token'
import {Signature, PrivateKey, Aes} from "@graphene/ecc"
import hash from "@graphene/hash"
import {Wallet} from "../src/db/models.js"
import replApi from "../src/ReplApi"
import bs58 from "bs58"

const port = process.env.npm_package_config_rest_port

/** These test may depend on each other.  For example: createWallet is the setup for fetchWallet, etc...  */
describe('Wallet database', () => {

    before( done =>{
        replApi.start(done)
        // clean up from a failed run
        Wallet.findOne({where: {email: "alice@example.bitbucket"}})
            .then( wallet =>{ wallet.destroy().then(()=>{ done() })})
    })

    it('createWallet', done => {
        let code = createToken("alice@example.bitbucket")
        var private_key = PrivateKey.fromSeed("")
        let encrypted_data = Aes.fromSeed("").encrypt("data")
        let local_hash = hash.sha256(encrypted_data, 'base64')
        let signature = Signature.signBuffer(encrypted_data, private_key)
        let body = new FormData()
        body.append('code', bs58.encode(new Buffer(code, 'binary')))
        body.append('signature', signature.toHex())
        body.append('encrypted_data', encrypted_data.toString('binary'))
        fetch(
            "http://localhost:"+port+ `/createWallet`,
            { method: 'POST', body })
            .then( res => {
                assert.equal("OK", res.statusText)
                assert.equal(200, res.status)
                assert.equal(true, res.ok)
                return res.json()
            })
            .then( json => {
                assert.equal("OK", json.code_description)
                assert.equal(200, json.code)
                assert.equal(private_key.toPublicKey().toString(), json.public_key, 'public_key')
                // console.log("json", json, hash.sha256(encrypted_data, 'base64'))
                assert.equal(local_hash, json.local_hash, 'local_hash')
                // leave the wallet for other tests
                done()
            })
            .catch( error =>{ console.error(error); throw error })
    })
    
    it('fetchWallet (modified)', done => {
        let public_key = PrivateKey.fromSeed("").toPublicKey().toString()
        let encrypted_data = Aes.fromSeed("").encrypt("data")
        let local_hash = null
        fetch("http://localhost:"+port+ `/fetchWallet?public_key=${public_key}&local_hash=${local_hash}`)
            .then( res => {
                assert.equal("OK", res.statusText)
                assert.equal(200, res.status)
                return res.json().then( e=>{console.log('e',e); return e})
            }).
            then( json => {
                assert.equal("OK", json.code_description)
                assert.equal(200, json.code)
                assert.equal('alice@example.bitbucket', json.email)
                assert.equal(public_key, json.public_key)
                assert.equal(130, json.signature.length)
                assert(json.local_hash)
                assert(json.encrypted_data)
                done()
            }).catch( error =>{ console.error(error, error.stack); throw error })
    })
    
    it('fetchWallet (not modified)', done => {
        let public_key = PrivateKey.fromSeed("").toPublicKey().toString()
        let encrypted_data = Aes.fromSeed("").encrypt("data")
        let local_hash = hash.sha256(encrypted_data, 'base64')
        fetch("http://localhost:"+port+ `/fetchWallet?public_key=${public_key}&local_hash=${local_hash}`)
            .then( res => {
                assert.equal("Not Modified", res.statusText)
                assert.equal(304, res.status)
                done()
            }).catch( error =>{ console.error(error, error.stack); throw error })
    })
    
    it('saveWallet', done => {
        var private_key = PrivateKey.fromSeed("")
        let encrypted_data = Aes.fromSeed("").encrypt("data2")
        let signature = Signature.signBuffer(encrypted_data, private_key)
        let body = new FormData()
        body.append('signature', signature.toHex())
        body.append('encrypted_data', encrypted_data.toString('binary'))
        fetch(
            "http://localhost:"+port+ `/saveWallet`,
            { method: 'POST', body })
            .then( res => {
                assert.equal("OK", res.statusText)
                assert.equal(200, res.status)
                done()
            })
            .catch( error =>{ console.error(error); throw error })
    })
    
    it('fetchWallet (newly saved)', done => {
        let public_key = PrivateKey.fromSeed("").toPublicKey().toString()
        let encrypted_data = Aes.fromSeed("").encrypt("data2")
        let local_hash = hash.sha256(encrypted_data, 'base64')
        fetch("http://localhost:"+port+ `/fetchWallet?public_key=${public_key}&local_hash=${local_hash}`)
            .then( res => {
                assert.equal("Not Modified", res.statusText)
                assert.equal(304, res.status)
                done()
            }).catch( error =>{ console.error(error, error.stack); throw error })
    })
    
    it('saveWallet (unknown key)', done => {
        // change "nobody" to "" and it should pass (should match createWallet's private key)
        var private_key = PrivateKey.fromSeed("")
        let encrypted_data = Aes.fromSeed("").encrypt("data2")
        let signature = Signature.signBuffer(encrypted_data, private_key)
        let body = new FormData()
        body.append('signature', signature.toHex())
        body.append('encrypted_data', encrypted_data.toString('binary'))
        fetch(
            "http://localhost:"+port+ `/saveWallet`,
            { method: 'POST', body })
            .then( res => {
                assert.equal("Bad Request", res.statusText)
                assert.equal(400, res.status)
                done()
            })
            .catch( error =>{ console.error(error); throw error })
    })
    
    it('changePassword', done => {
        let old_private_key = PrivateKey.fromSeed("")
        let old_encrypted_data = Aes.fromSeed("").encrypt("data2")
        let old_local_hash = hash.sha256(old_encrypted_data)
        let old_signature = Signature.signBufferSha256(old_local_hash, old_private_key)
        
        let new_private_key = PrivateKey.fromSeed("2")
        let new_encrypted_data = Aes.fromSeed("").encrypt("data2")
        let new_signature = Signature.signBuffer(old_encrypted_data, old_private_key)
        
        let body = new FormData()
        body.append('original_local_hash', old_local_hash.toString('binary'))
        body.append('original_signature', old_signature.toHex())
        body.append('new_encrypted_data', new_encrypted_data.toString('binary'))
        body.append('new_signature', new_signature.toHex())
        fetch(
            "http://localhost:"+port+ `/saveWallet`,
            { method: 'POST', body })
            .then( res => {
                assert.equal("Bad Request", res.statusText)
                assert.equal(400, res.status)
                done()
            })
            .catch( error =>{ console.error(error); throw error })
    })
    
    
    /** End of the wallet tests, clean-up... */
    it('deleteWallet', done=>{
        // clean up from a failed run
        Wallet.findOne({where: {email: "alice@example.bitbucket"}})
            .then( wallet =>{ wallet.destroy().then(()=>{ done() })})
    })
    
})