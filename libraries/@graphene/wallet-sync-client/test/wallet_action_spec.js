import assert from "assert"
import {createToken} from '@graphene/time-token'
import {Signature, PrivateKey, Aes, hash} from "@graphene/ecc"
import WalletSyncApi from "../src/WalletSyncApi"
import LocalStorageState from "../src/LocalStorageState"
import WalletSyncStorage from "../src/WalletSyncStorage"
import WalletSyncActions from "../src/WalletSyncActions"

const host = process.env.npm_package_config_server_host
const port = process.env.npm_package_config_server_port

const password = "password"
const email = "alice@example.bitbucket"
const code = createToken(hash.sha1(email, 'binary'))

// Configure to use localStorage for the purpose of these tests...
global.localStorage = require('localStorage')
const state = new LocalStorageState("wallet_action_spec")

var api = new WalletSyncApi(host, port)
var actions = new WalletSyncActions(api, state.reducer())

function clear() {
    state.clear()
    actions = new WalletSyncActions(api, state.reducer())
}

describe('Wallet Actions', () => {

    it('validateCode', () => {
        clear()
        actions = new WalletSyncActions(api, state.reducer())
        throws(()=>actions.validateCode(code), "missing_email")
        actions.storage.setEmail(email, 10)
        assert.equal(actions.storage.state.get("email_validated"), undefined, "email_validated")
        actions.validateCode(code)
        assert.equal(actions.storage.state.get("email_validated"), true, "email_validated")
    })
    
    it('unlock', () => {
        clear()
        assert.equal(actions.isLocked(), true, "isLocked")
        throws(()=>actions.unlock(password), "missing_email")
        actions.storage.setEmail(email, 10)
        actions.unlock(password)
        assert.equal(actions.isLocked(), false, "isLocked")
        actions.lock()
        assert.equal(actions.isLocked(), true, "isLocked")
        throws(()=> actions.unlock(password+"wrong"), "invalid_password")
    })
    
    it('put', done => {
        clear()
        actions.storage.setEmail(email, 10)
        actions.validateCode(code)
        actions.unlock(password)
        resolve( actions.put({ name: "default_wallet" }), ()=>{
            done()
        })
    })
    
    it('get', done => {
        clear()
        actions.storage.setEmail(email, 10)
        actions.validateCode(code)
        actions.unlock(password)
        resolve( actions.get(), status =>{
            assert(status, "OK", 'status')
            done()
        })
    })
    
    it('delete', done => {
        clear()
        actions.storage.setEmail(email, 10)
        actions.validateCode(code)
        actions.unlock(password)
        resolve(actions.delete(), done)
    })
    
})


function throws(f, contains) {
    try{
        f()
    } catch(error) {
        if( new RegExp(contains).test(error) ) return
        console.error('[throws] ' + error, error.stack)
    }
    throw new Error("[throws] did not encounter error: " + contains)
}
function resolve(promise, done) {
    if( ! promise ) throw new TypeError("Missing: promise")
    return promise
        .catch(error =>{ console.error(error, error.stack); throw error})
        .then( result =>{ if( done ) done() })
}