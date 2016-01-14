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

describe('Single Wallet', () => {
    
    var wallet

    function initWallet() {
        storage.clear()
        wallet = new Wallet(storage)
    }
    
    // Ensure there is no wallet on the server
    beforeEach(()=>{
        return remoteWallet().then( wallet1 => {
            return wallet1.keepRemoteCopy(false) // delete
                .then(()=> wallet1.logout())
                .then(()=> initWallet())
                .catch( error=>{ console.error("wallet_spec\tbeforeEach", error); throw error })
        })
    })
    
    afterEach(()=> wallet.logout())

    it('Server wallet', ()=> {
        
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
            return assertServerWallet({ test_wallet: 'secret2'}, wallet)
        })
    })
    
    it('Disk wallet', ()=> {
        
        // Create a local wallet
        wallet.keepLocalCopy(true)
        let create = wallet
            .login(email, username, password)
            .then(()=> wallet.setState({ test_wallet: 'secret'}) )// create
            .then(()=> wallet.setState({ test_wallet: 'secret2'}) )// update
        
        return create.then(()=>{
            
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
            return assertNoServerWallet(wallet)
            
        })
    })
    
    it('Memory wallet', ()=> {
        // keepLocalCopy false may not be necessary (off is the default), however it will also delete anything on disk
        wallet.keepLocalCopy(false)
        let create = wallet
            .login(email, username, password)
            .then(()=> wallet.setState({ test_wallet: 'secret'}) )// create
            .then(()=> wallet.setState({ test_wallet: 'secret2'}) )// update
        
        return create.then(()=> {
            
            // Wallet is in memory
            assert.equal(wallet.wallet_object.get("test_wallet"), "secret2")
            
            // It is not on disk
            let testStorage = new LocalStoragePersistence("wallet_spec")
            let json = testStorage.getState().toJS()
            assert.equal("{}", JSON.stringify(json), "disk was not empty")
            
            // It is not on the server
            return assertNoServerWallet(wallet)
        })
    })
    
    it('Server offline updates', ()=> {
        
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
            
            return assertServerWallet({ test_wallet: 'secret'}, wallet)//still on server
                .then(()=> wallet.setState({ test_wallet: 'offline secret'}))//local change
                .then(()=> wallet.setState({ test_wallet: 'offline secret2'}))//local change
                .then(()=>{
                
                // the old wallet is still on the server
                return assertServerWallet({ test_wallet: 'secret'}, wallet)//server unchanged
                    .then(()=>{
                    
                    wallet.useBackupServer(remote_url)//configure to hookup again
                    
                    // there were 2 updates, now sync remotely
                    return wallet.keepRemoteCopy(true)//backup to server
                        .then(()=>{
                        
                        // New wallet is on the server
                        return assertServerWallet({ test_wallet: 'offline secret2'}, wallet)
                    })
                })
            })
        })
    })
})

describe('Multi Wallet', () => {
    
    beforeEach(()=>{
        // delete the test wallet
        return remoteWallet().then( wallet => {
            return wallet.keepRemoteCopy(false) // delete
                .then(()=> wallet.logout())
                .catch( error=>{ console.error("wallet_spec\tMulti Wallet beforeEach", error); throw error })
        })
    })
    
    it('Server conflict', () => {
        return remoteWallet().then( wallet => {
            return wallet.setState({ test_wallet: ''})
                // create a second wallet client (same email, same server wallet)
                .then(()=> remoteWallet()).then( wallet2 => {
                
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
                        assert.equal(wallet_object.get("test_wallet"), 'secret')
                        assert.equal(wallet.wallet_object.get("test_wallet"), 'secret')
                        
                        // Cause a conflict updating 2nd client
                        return wallet2.getState()
                            .then( ()=> assert(false, '2nd client should not update'))
                            .catch( error => {
                            assert(/^Conflict/.test(error), 'Expecting conflict')
                        })
                        
                    })
                }).then(()=> wallet2.logout())
            }).then(()=> wallet.logout())
        })
    })
    
    it('Server subscription update', () => {
        return Promise.all([ remoteWallet(), remoteWallet() ]).then( result =>{
            let [ wallet1, wallet2 ] = result
            
            var p1 =
                wallet1.setState({ test_wallet: 'secret' }).then(()=>
                wallet2.getState()
                    .then( object2 => assert.equal(object2.get("test_wallet"), 'secret'))
                    .then( ()=> wallet2.setState({ test_wallet: 'secret2' }))
                    // .then( wallet1.getState().then( object1 => assert.equal(object1.get("test_wallet"), 'secret2')))
                )
            
            return p1.then(()=> Promise.all([wallet1.logout(), wallet2.logout()]))
            
        })
    })
    
})

function newWallet() {
    let storage = new LocalStoragePersistence("wallet_spec")
    storage.clear() // Clearing memory (ignore disk contents)
    return new Wallet(storage)
}

/** @return {Promise} resolves after remote wallet login */
function remoteWallet(emailParam = email) {
    let code = createToken(hash.sha1(emailParam, 'binary'))
    let wallet = newWallet()
    wallet.useBackupServer(remote_url)
    wallet.keepRemoteCopy(true, code)
    return wallet.login(emailParam, username, password).then(()=> wallet )
}

function assertNoServerWallet(walletParam) {
    if( ! walletParam.private_key ) throw new Error("wallet locked")
    let ws_rpc = new WebSocketRpc(remote_url)
    let api = new WalletApi(ws_rpc)
    let p1 = new Promise( (resolve, reject) => {
        let public_key = walletParam.private_key.toPublicKey()
        let p2 = api.fetchWallet( public_key, null, json => {
            try {
                assert.equal(json.statusText, "No Content")
            } catch( error ) {
                reject( error )
            }
        }).catch( error => reject(error))
        resolve(p2.then(()=> api.fetchWalletUnsubscribe(public_key)))
    })
    return p1.then(()=> ws_rpc.close())
}

function assertServerWallet(expectedWallet, walletParam) {
    if( ! walletParam.private_key ) throw new Error("wallet locked")
    let ws_rpc = new WebSocketRpc(remote_url)
    let api = new WalletApi(ws_rpc)
    let p1 = new Promise( (resolve, reject) => {
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
                resolve(Promise.all([ p3, p4 ]))
            } catch( error ) {
                reject( error )
            }
        }).catch( error => reject(error))
    })
    return p1.then(()=> ws_rpc.close())
}
