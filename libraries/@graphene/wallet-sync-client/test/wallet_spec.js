import assert from "assert"
import {createToken} from '@graphene/time-token'
import {Signature, PrivateKey, Aes, hash} from "@graphene/ecc"
import LocalStoragePersistence from "../src/LocalStoragePersistence"
import Wallet from "../src/Wallet"

const remote_url = process.env.npm_package_config_remote_url

const email = "alice_v1@example.bitbucket"
const username = "username"
const password = "password"
const code = createToken(hash.sha1(email, 'binary'))

// Configure to use localStorage for the purpose of these tests...
global.localStorage = require('localStorage')
const storage = new LocalStoragePersistence("wallet_action_spec")
var wallet

// reset local data, completely a blank-slate
function resetStorage() {
    storage.clear()
    wallet = new Wallet(storage)
}

describe('Wallet Actions', () => {
    
    it('createWallet', done => {
        resolve(deleteWallet(), ()=>{
            resetStorage()
            wallet.keepLocalCopy(true)
            wallet.keepRemoteCopy(true, code)
            wallet.useBackupServer(remote_url)
            let p = wallet
                .login(email, username, password)
                .then(()=> wallet.setState({ test_wallet: 'secret'}) )
            
            resolve(p, done)
        })
    })
    
    
    
})

function deleteWallet() {
    resetStorage()
    wallet.useBackupServer(remote_url)
    wallet.keepRemoteCopy(false, code)
    wallet.keepLocalCopy(false)
    return wallet.login(email, username, password)
        .then( ()=> wallet.delete() )
}

function throws(f, contains) {
    try{
        f()
    } catch(error) {
        if( new RegExp(contains).test(error) ) return
        console.error('[throws] ' + error, 'stack', error.stack)
    }
    throw new Error("[throws] did not encounter error: " + contains)
}

function resolve(promise, done) {
    if( ! promise ) throw new TypeError("Missing: promise")
    return promise
        .catch(error =>{ console.error(error, 'stack', error.stack); throw error})
        .then( result =>{ if( done ) done(); return result })
}