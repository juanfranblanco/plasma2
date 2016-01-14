import assert from "assert"
import {Map} from "immutable"
import { encrypt, decrypt } from "../src/WalletActions"
import {createToken} from '@graphene/time-token'
import {Signature, PrivateKey, Aes, hash} from "@graphene/ecc"
import LocalStoragePersistence from "../src/LocalStoragePersistence"
import Wallet from "../src/Wallet"
import WebSocketRpc from "../src/WebSocketRpc"
import WalletApi from "../src/WalletApi"

const username = "username"
const password = "password"
const email = "alice_spec@example.bitbucket"
const code = createToken(hash.sha1(email, 'binary'))
const remote_url = process.env.npm_package_config_remote_url

// Configure to use localStorage for the purpose of these tests...
global.localStorage = require('localStorage')
const storage = new LocalStoragePersistence("wallet_spec")

var wallet

function initWallet() {
    storage.clear()
    wallet = new Wallet(storage)
}

describe('Wallet Tests', () => {
    
    // Ensure there is no wallet on the server
    beforeEach(()=>{
        initWallet()
        wallet.useBackupServer(remote_url)
        wallet.keepRemoteCopy(true, code)
        // "login" will sync from the server
        return wallet.login(email, username, password)
            .then(()=> wallet.keepRemoteCopy(false))// delete
            .then(()=> wallet.logout())
            .then(()=> initWallet())
            .catch( error=>{ console.error("wallet_spec\tbeforeEach", error); throw error })
    })
    
    afterEach(()=> wallet.logout())

    // Delete wallet before each test, and reset for the next test
    // beforeEach(()=> deleteWallet().then(()=> initWallet()))
    
    // after(()=> wallet.logout().then(()=> wallet.useBackupServer()))
    
    it('Server only', ()=> {
        
        wallet.useBackupServer(remote_url)
        wallet.keepRemoteCopy(true, code)
        
        let create = wallet
            .login(email, username, password)
            // create the initial wallet
            .then(()=> wallet.setState({ test_wallet: 'secret'}) )
            // update the wallet
            .then(()=> wallet.setState({ test_wallet: 'secret2'}) )
        
        return create.then(()=>{
            
            // Wallet is in memory
            assert.equal(wallet.wallet_object.get("test_wallet"), "secret2")
            
            // Wallet is on the server
            return assertServerWallet({ test_wallet: 'secret2'})
        })
    })
    
    it('Disk only', done => {
        
        // Create a local wallet
        wallet.keepLocalCopy(true)
        let create = wallet
            .login(email, username, password)
            .then(()=> wallet.setState({ test_wallet: 'secret'}) )// create
            .then(()=> wallet.setState({ test_wallet: 'secret2'}) )// update
        
        let assertPromise = create.then(()=>{
            
            // Wallet is in memory
            assert.equal(wallet.wallet_object.get("test_wallet"), "secret2")
            
            // Verify the disk wallet exists
            let testStorage = new LocalStoragePersistence("wallet_spec")
            let json = testStorage.getState().toJS()
            assert(json.remote_hash == null, 'remote_hash')
            assert(json.encrypted_wallet,'encrypted_wallet')
            assert(json.encryption_pubkey,'encryption_pubkey')
            wallet.keepLocalCopy(false)// clean-up (delete it from disk)
            
            // It is not on the server
            return assertNoServerWallet()
            
        })
        resolve(assertPromise, done)
    })
    
    it('Memory', done => {
        // keepLocalCopy false may not be necessary (off is the default), however it will also delete anything on disk
        wallet.keepLocalCopy(false)
        let create = wallet
            .login(email, username, password)
            .then(()=> wallet.setState({ test_wallet: 'secret'}) )// create
            .then(()=> wallet.setState({ test_wallet: 'secret2'}) )// update
        
        let assertPromise = create.then(()=> {
            
            // Wallet is in memory
            assert.equal(wallet.wallet_object.get("test_wallet"), "secret2")
            
            // It is not on disk
            let testStorage = new LocalStoragePersistence("wallet_spec")
            let json = testStorage.getState().toJS()
            assert.equal("{}", JSON.stringify(json), "disk was not empty")
            
            // It is not on the server
            return assertNoServerWallet()
        })
        resolve(assertPromise, done)
    })
    
    it('Server offline updates', () => {
        wallet.useBackupServer(remote_url)
        wallet.keepRemoteCopy(true, code)
        
        let create = wallet.login(email, username, password)
            // create the initial wallet
            .then(()=> wallet.setState({ test_wallet: 'secret'}) )

        return create.then(()=>{
            
            // disconnect from the backup server
            wallet.useBackupServer(null)
            
            // does not delete wallet on the server (it was disconnect above)
            wallet.keepRemoteCopy(false)
            
            return assertServerWallet({ test_wallet: 'secret'})//still on server
                .then(()=> wallet.setState({ test_wallet: 'offline secret'}))//local change
                .then(()=> wallet.setState({ test_wallet: 'offline secret2'}))//local change
                .then(()=>{
                
                // the old wallet is still on the server
                return assertServerWallet({ test_wallet: 'secret'})//server unchanged
                    .then(()=>{
                    
                    wallet.useBackupServer(remote_url)//hookup again
                    
                    // there were 2 updates, now sync remotely
                    return wallet.keepRemoteCopy(true)//backup to server
                        .then(()=>{
                        
                        // New wallet is on the server
                        return assertServerWallet({ test_wallet: 'offline secret2'})
                    })
                })
            })
        })
    })
    
    it('Server conflict', () => {
        return remoteWallet(email).then( wallet => {
            return wallet.setState({ test_wallet: ''})
                // create a second wallet client (same email, same server wallet)
                .then(()=> remoteWallet(email)).then( wallet2 => {
                
                // bring both clients offline
                wallet.useBackupServer(null)
                wallet2.useBackupServer(null)
                
                return wallet.setState({ test_wallet: 'secret' })
                    .then(()=> wallet2.setState({ test_wallet: 'secret2' }))
                    .then(()=> {
                    
                    // bring clients online
                    wallet.useBackupServer(remote_url)
                    wallet2.useBackupServer(remote_url)
                    
                    // 1st one to update wins
                    return wallet.getState().then( wallet_object => {
                        
                        // Be sure the wallet synced up
                        assert.equal(wallet.wallet_object.get("test_wallet"), 'secret')
                        
                        // Cause a conflict updating 2nd client
                        return wallet2.getState()
                            .then( ()=> assert(false, '2nd client should not update'))
                            .catch( error => {
                            assert(/^conflict/.test(error), 'Expecting conflict')
                        })
                        
                    })
                })
            })
        })
    })
    
})

/** Allows multiple remote wallets */
function remoteWallet(email) {
    let code = createToken(hash.sha1(email, 'binary'))
    let wallet = newWallet()
    wallet.useBackupServer(remote_url)
    wallet.keepRemoteCopy(true, code)
    return wallet.login(email, username, password).then(()=> wallet )
}

function newWallet() {
    let storage = new LocalStoragePersistence("wallet_spec")
    storage.clear() // Clearing memory (ignore disk contents)
    return new Wallet(storage)
}

function assertNoServerWallet(walletParam = wallet) {
    if( ! walletParam.private_key ) throw new Error("wallet locked")
    return newApi(api =>{
        return api.fetchWallet( walletParam.private_key.toPublicKey() ).then( json=> {
            assert(json.encrypted_data == null, 'No Server Wallet')
        })
    })
}

function assertServerWallet(expectedWallet, walletParam = wallet) {
    if( ! walletParam.private_key ) throw new Error("wallet locked")
    let ws_rpc = new WebSocketRpc(remote_url)
    let api = new WalletApi(ws_rpc)
    let p1 = new Promise( (resolve, reject) => {
        console.log("assertServerWallet");
        let public_key = walletParam.private_key.toPublicKey()
        let p2 = api.fetchWallet( public_key, null, json => {
            try {
                assert(json.encrypted_data, 'No Server Wallet')
                let backup_buffer = new Buffer(json.encrypted_data, 'base64')
                let p3 = decrypt(backup_buffer, walletParam.private_key).then( wallet_object => {
                    assert.equal(
                        JSON.stringify(wallet_object,null,0),
                        JSON.stringify(expectedWallet,null,0)
                    )
                })
                let p4 = api.fetchWalletUnsubscribe(public_key)
                resolve([ p3, p4 ])
            } catch( error ) {
                reject( error )
            }
        }).catch( error => reject(error))
    })
    return p1.then(()=> ws_rpc.close())
}

function deleteWallet(emailParam = email) {
    let sig = wallet.signHash()
    if( ! sig ) return Promise.resolve()
    let { local_hash, signature } = sig
    return newApi(api => {
        return api.deleteWallet( local_hash, signature ).catch( error =>{
            if( ! error.res.statusText === "Not Found") {
                console.error("ERROR", error, "stack", error.stack)
                throw error
            }
        })
    })
}

function newApi(callback) {
    let ws_rpc = new WebSocketRpc(remote_url)
    let ret
    try {
        
        ret = callback( api )
    } finally {
        return ret ? ret.then(()=> ws_rpc.close()) : ws_rpc.close()
    }
}

function resolve(promise, done) {
    if( ! promise ) throw new TypeError("Missing: promise")
    return promise
        .then( result =>{ if( done ) done(); return result })
        .catch(error =>{ console.error(error, 'stack', error.stack); throw error})
}