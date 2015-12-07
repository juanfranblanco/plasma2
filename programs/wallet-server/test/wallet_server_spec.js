import {expect} from 'chai'
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
        let local_hash = hash.sha1(encrypted_data.toString('binary')).toString('base64')
        let signature = Signature.signBuffer(encrypted_data, private_key)
        let body = new FormData()
        body.append('code', bs58.encode(new Buffer(code, 'binary')))
        body.append('signature', signature.toHex())
        body.append('encrypted_data', encrypted_data.toString('binary'))
        fetch(
            "http://localhost:"+port+ `/createWallet`,
            { method: 'POST', body })
            .then( res => {
                assert.equal(200, res.status)
                return res.json()
            })
            .then( json => {
                assert.equal(200, json.code)
                assert.equal("OK", json.code_description)
                assert.equal(private_key.toPublicKey().toString(), json.public_key)
                // console.log("json", json, hash.sha1(encrypted_data.toString('binary')).toString('base64'))
                assert.equal(local_hash, json.local_hash)
                // leave the wallet for other tests
                done()
            })
            .catch( error =>{ console.error(error); throw error })
    })
    
    it('fetchWallet (modified)', done => {
        let public_key = PrivateKey.fromSeed("").toPublicKey().toString()
        let encrypted_data = Aes.fromSeed("").encrypt("data")
        let local_hash = null//hash.sha1(encrypted_data.toString('binary')).toString('base64')
        fetch("http://localhost:"+port+ `/fetchWallet?public_key=${public_key}&local_hash=${local_hash}`)
            .then( res => {
                assert.equal(true, res.ok)
                assert.equal(200, res.status)
                assert.equal("OK", res.statusText)
                return res.json().then( e=>{console.log('e',e); return e})
            }).
            then( json => {
                assert.equal(200, json.code)
                assert.equal("OK", json.code_description)
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
        let local_hash = hash.sha1(encrypted_data.toString('binary')).toString('base64')
        fetch("http://localhost:"+port+ `/fetchWallet?public_key=${public_key}&local_hash=${local_hash}`)
            .then( res => {
                // assert.equal(true, res.ok)
                assert.equal(304, res.status)
                assert.equal("Not Modified", res.statusText)
                done()
            }).catch( error =>{ console.error(error, error.stack); throw error })
    })
    
    
    /** End of the wallet tests, clean-up... */
    it('deleteWallet', done=>{
        // clean up from a failed run
        Wallet.findOne({where: {email: "alice@example.bitbucket"}})
            .then( wallet =>{ wallet.destroy().then(()=>{ done() })})
    })
    
})