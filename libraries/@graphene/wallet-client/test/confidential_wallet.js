import assert from "assert"
import { PublicKey, PrivateKey } from "@graphene/ecc"
import { Apis } from "@graphene/chain"

import LocalStoragePersistence from "../src/LocalStoragePersistence"
// import { is, fromJS } from "immutable"

import WalletStorage from "../src/WalletStorage"
import ConfidentialWallet from "../src/ConfidentialWallet"

const username = "username"
const password = "password"
const email = "alice_spec@example.bitbucket"

// Configure to use localStorage for the purpose of these tests...
global.localStorage = require('localStorage')
const storage = new LocalStoragePersistence("wallet_spec")

describe('Confidential Wallet', () => {
    
    let wallet, cw
    let nathan = PrivateKey.fromSeed("nathan")
    let create = (name = "a1", brainkey = "brainkey")=> cw.createBlindAccount(name, brainkey)

    function initWallet() {
        storage.clear()
        wallet = new WalletStorage(storage)
        cw = new ConfidentialWallet(wallet)
    }
    
    beforeEach(()=>{
        initWallet()
    })
    
    // afterEach(()=> wallet.logout())

    it('Keys', ()=> {
        
        wallet.login(username, password, email)
        
        let public_key = PrivateKey.fromSeed("").toPublicKey().toString()
        
        assert( cw.setKeyLabel( public_key, "label"), "add key and label")
        assert.equal( cw.getKeyLabel(public_key), "label" )
        
        assert( cw.setKeyLabel( public_key, "label2" ), "rename label")
        assert.equal( cw.getKeyLabel(public_key), "label2" )
        
        assert( ! cw.setKeyLabel( "public_key2", "label2"), "label already assigned")
        
        assert.equal( cw.getKeyLabel(public_key), "label2", "fetch label")
        assert.equal( cw.getPublicKey("label2"), public_key.toString(), "fetch key")
        
        assert( cw.getKeyLabel("") === null, "fetch label should return null")
        assert( cw.getPublicKey("") === null, "fetch key should return null")
    })
    
    it('Accounts', ()=> {
        
        assert.deepEqual( cw.getBlindAccounts().toJS(), {} )
        
        assert.throws(create, /locked/, "This test should require an unlocked wallet" )
        
        // unlock
        wallet.login(username, password, email)
        
        assert(create().Q, "Should return a public key")
        
        assert.throws(create, /label_exists/, "Expecting a 'label_exists' exception" )
        
        assert.deepEqual(
            cw.getBlindAccounts().toJS(),
            { "a1":  PrivateKey.fromSeed("brainkey").toPublicKey().toString() }
        )
        
        assert.deepEqual(
            cw.getMyBlindAccounts().toJS(),
            { "a1":  PrivateKey.fromSeed("brainkey").toPublicKey().toString() }
        )
        
        assert.equal(
            create("alice", "alice-brain-key").toString(),
            "GPH7vbxtK1WaZqXsiCHPcjVFBewVj8HFRd5Z5XZDpN6Pvb2dZcMqK",
            "Match against a known public key (matching the graphene cli wallet)"
        )
                
    })
    
    it("Transfer", ()=> {
        
        return Apis.instance("ws://localhost:8090").init_promise.then(()=> {
            
            wallet.login(username, password, email)
            create("alice", "alice-brain-key")
            create("bob", "bob-brain-key")
            
            return cw.transferToBlind( "nathan", "CORE", [["alice",1]["bob",1]]).then(tx =>{
                console.log("tx", tx)
            })
            
        })
        
    })
        
    
})