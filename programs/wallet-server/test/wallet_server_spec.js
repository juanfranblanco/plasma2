// import {expect} from 'chai'
import { List, Map, fromJS } from 'immutable'
import * as api from '../src/WalletSyncApi'
import r from "../src/reducer"
import assert from "assert"
import fetch from "node-fetch"
import FormData from "form-data"
import {createToken, checkToken} from '@graphene/time-token'
import {Signature, PrivateKey, Aes} from "@graphene/ecc"
import replApi from "../src/ReplApi"
import bs58 from "bs58"

const port = process.env.npm_package_config_rest_port

describe('wallet server', () => {

    before( done =>{ replApi.start(done) })
    
    it('requestCode', () => {
        fetch("http://localhost:"+port+ "/requestCode?email=alice@example.bitbucket")
            .then( res => {
                assert(true, res.ok)
                assert(200, res.status)
                assert("OK", res.statusText)
                console.log("requestCode passed");
                // done() // todo increase timeout
            }).catch( error =>{ assert.ifError(error) })
    })
    
    it('createWallet', done => {
        let code = createToken("alice@example.bitbucket")
        let signature = Signature.signBuffer(new Buffer(""), PrivateKey.fromSeed(""))
        let aes = Aes.fromSeed("")
        let encrypted_data = aes.encrypt("data")
        let body = new FormData()
        body.append('encrypted_data', encrypted_data.toString('binary'))
        body.append('code', bs58.encode(new Buffer(code, 'binary')))
        body.append('signature', signature.toHex())
        fetch(
            "http://localhost:"+port+ `/createWallet`,
            { method: 'POST', body })
            .then( res => {
                assert(200, res.status)
                return res.json()
            })
            .catch( error =>{ assert.ifError(error) })
            .then( json => {
                // assert(null, error, error)
                // assert(200, json.statusCode, response.statusCode)
                assert(200, json.code)
                assert("OK", json.code_description)
                console.log("createWallet json", json)
                done()
            })
    })
    // 
    // describe('createWallet', () => {
    //     let state = Immutable.Map()
    //     let encrypted_data = new Buffer(randomBytes, 'binary')
    //     let action = api.createWallet({ code, encrypted_data, signature })
    //     r.reducer(state, action)
    //     it('adds to email queue', () => {
    //         const state = Map()
    //         const nextState = requestCode(state, { email: "alice@example.com" })
    //         expect(nextState).to.equal(fromJS({
    //             requestCode: [ "alice@example.com" ]
    //         }))
    //     })
    //     it('adds to email queue via action', () => {
    //         const state = Map()
    //         const action = {type: 'requestCode', email: "jan@example.com"}
    //         const nextState = reducer(state, action)
    //         expect(nextState).to.equal(fromJS({
    //             requestCode: [ "jan@example.com" ]
    //         }))
    //     })
    // })
})
