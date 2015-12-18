import assert from "assert"
import {createToken} from '@graphene/time-token'
import {Signature, PrivateKey, Aes, hash} from "@graphene/ecc"
import LocalStoragePersistence from "../src/LocalStoragePersistence"
import WalletState from "../src/WalletState"
import Wallet from "../src/Wallet"

const host = process.env.npm_package_config_server_url

const email = "alice@example.bitbucket"
const username = "username"
const password = "password"
const code = createToken(hash.sha1(email, 'binary'))

// Configure to use localStorage for the purpose of these tests...
global.localStorage = require('localStorage')
const storage = new LocalStoragePersistence("wallet_action_spec")

var wallet

// reset local data, completely a blank-slate
function clear() {
    state.clear()
    wallet = new Wallet(storage.persister())
}

// clear(as above) then initialize and login wallet
function init() {
    clear()
    wallet.storage.setEmail(email, 10)
    wallet.validateCode(code)
    wallet.login(email, username, password)
}

describe('Wallet Actions', () => {

    beforeEach( done =>{
        init()
        resolve(wallet.get().then( res =>{
            if(res.statusText === "No Content") return
            console.log("res2", res)
            return deleteWallet().then(()=> done()).catch( error=>{
                if( ! /no_local_wallet/.test(error)) throw error
            })
        }), done)
    })
    
    it('validateCode', () => {
        clear()
        wallet = new Wallet(api, state.persister())
        throws(()=>wallet.validateCode(code), "missing_email")
        wallet.storage.setEmail(email, 10)
        assert.equal(wallet.storage.state.get("email_validated"), undefined, "email_validated")
        wallet.validateCode(code)
        assert.equal(wallet.storage.state.get("email_validated"), true, "email_validated")
    })
    
    it('login', () => {
        clear()
        assert.equal(wallet.isLocked(), true, "isLocked")
        throws(()=>wallet.login(email, username, password), "missing_email")
        wallet.storage.setEmail(email, 10)
        wallet.login(email, username, password)
        assert.equal(wallet.isLocked(), false, "isLocked")
        wallet.logout()
        assert.equal(wallet.isLocked(), true, "isLocked")
        throws(()=> wallet.login(username, password+"wrong"), "invalid_password")
    })
    
    it('put', done => {
        init()
        resolve( wallet.put({ name: "default_wallet" }), ()=>{
            done()
        })
    })
    
    it('get', done => {
        clear()
        wallet.storage.setEmail(email, 10)
        wallet.validateCode(code)
        wallet.login(email, username, password)
        resolve( wallet.get(), status =>{
            assert(status, "OK", 'status')
            done()
        })
    })
    
    it('delete', done => {
        resolve(deleteWallet(), done)
    })
    
})

function deleteWallet() {
    clear()
    wallet.storage.setEmail(email, 10)
    wallet.validateCode(code)
    wallet.login(email, username, password)
    return wallet.delete()
}

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