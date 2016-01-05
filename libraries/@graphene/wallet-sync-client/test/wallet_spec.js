import assert from "assert"
import {Map} from "immutable"
import { encrypt, decrypt } from "../src/WalletActions"
import {createToken} from '@graphene/time-token'
import {Signature, PrivateKey, Aes, hash} from "@graphene/ecc"
import LocalStoragePersistence from "../src/LocalStoragePersistence"
import Wallet from "../src/Wallet"
import WalletApi from "../src/WalletApi"

const remote_url = process.env.npm_package_config_remote_url

const email = "alice@example.bitbucket"
const username = "username"
const password = "password"
const code = createToken(hash.sha1(email, 'binary'))

// Configure to use localStorage for the purpose of these tests...
global.localStorage = require('localStorage')
const storage = new LocalStoragePersistence("wallet_spec")
var wallet, api = new WalletApi(remote_url)

function initWallet() {
    storage.clear()
    wallet = new Wallet(storage)
}

describe('Wallet Actions', () => {
    
    // Delete the test wallet from the server just incase a prior-run failed
    before(done=>{
        initWallet()
        wallet.useBackupServer(remote_url)
        // "login" will sync from the server
        wallet.login(email, username, password)
            .then(()=>deleteWallet())
            .then(()=>done())
    })


    // Delete wallet after each test, then reset for the next test
    beforeEach(()=> deleteWallet().then(()=> initWallet()))
    
    it('createWallet remote', done => {
        wallet.useBackupServer(remote_url)
        wallet.keepRemoteCopy(true, code)
        let create = wallet
            .login(email, username, password)
            // create the initial wallet
            .then(()=> wallet.setState({ test_wallet: 'secret'}) )
            // update the wallet
            .then(()=> wallet.setState({ test_wallet: 'secret2'}) )
        
        resolve(create.then(()=>assertServerWallet({ test_wallet: 'secret2'})), done)
    })
    
    it('createWallet local', done => {
        // Create a local wallet
        wallet.keepLocalCopy(true)
        let create = wallet
            .login(email, username, password)
            .then(()=> wallet.setState({ test_wallet: 'secret'}) )
        
        let assertPromise = create.then(()=>{
            
            // Verify the disk wallet exists
            let testStorage = new LocalStoragePersistence("wallet_spec")
            let json = testStorage.getState().toJS()
            assert(json.email_sha1,'email_sha1')
            assert(json.local_hash,'local_hash')
            assert(json.encrypted_wallet,'encrypted_wallet')
            assert(json.encryption_pubkey,'encryption_pubkey')
            
            // It is not on the server
            return assertNoServerWallet({ test_wallet: 'secret' })
            
        })
        resolve(assertPromise, done)
    })
    
    it('createWallet ram', done => {
        wallet.keepLocalCopy(false)
        let create = wallet
            .login(email, username, password)
            .then(()=> wallet.setState({ test_wallet: 'secret'}) )
        
        let assertPromise = create.then(()=> {
            
            // It is not on disk
            let testStorage = new LocalStoragePersistence("wallet_spec")
            let json = testStorage.getState().toJS()
            assert.equal("{}", JSON.stringify(json), "disk was not empty")
            
            // It is not on the server
            return assertNoServerWallet({ test_wallet: 'secret' })
        })
        resolve(assertPromise, done)
    })

})

function assertNoServerWallet(expectedWallet) {
    return assertServerWallet(expectedWallet)
        .then(()=> assert(false,'Server Wallet Found'))
        .catch(json=> assert.equal('No Server Wallet', json.message, json))
}

function assertServerWallet(expectedWallet) {
    if( ! wallet.private_key ) throw new Error("wallet locked")
    return api.fetchWallet( wallet.private_key.toPublicKey() ).then( json=> {
        assert(json.encrypted_data, 'No Server Wallet')
        let backup_buffer = new Buffer(json.encrypted_data, 'base64')
        return decrypt(backup_buffer, wallet.private_key).then( wallet_object => {
            assert.equal(
                JSON.stringify(expectedWallet,null,0),
                JSON.stringify(wallet_object,null,0)
            )
        })
    })
}

function deleteWallet() {
    let sig = wallet.signHash()
    if( ! sig ) return Promise.resolve()
    let { local_hash, signature } = sig
    return api.deleteWallet( local_hash, signature ).catch( error =>{
        if( ! error.res.statusText === "Not Found")
            throw error
    })
}

function resolve(promise, done) {
    if( ! promise ) throw new TypeError("Missing: promise")
    return promise
        .then( result =>{ if( done ) done(); return result })
        .catch(error =>{ console.error(error, 'stack', error.stack); throw error})
}

// function throws(f, contains) {
//     try{
//         f()
//     } catch(error) {
//         if( new RegExp(contains).test(error) ) return
//         console.error('[throws] ' + error, 'stack', error.stack)
//     }
//     throw new Error("[throws] did not encounter error: " + contains)
// }