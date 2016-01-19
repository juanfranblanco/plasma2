import assert from "assert"
import {PublicKey, PrivateKey } from "@graphene/ecc"
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
    
    var wallet, confidentialWallet

    function initWallet() {
        storage.clear()
        wallet = new WalletStorage(storage)
        confidentialWallet = new ConfidentialWallet(wallet)
    }
    
    beforeEach(()=>{
        initWallet()
    })
    
    // afterEach(()=> wallet.logout())

    it('Key labels', ()=> {
        wallet.login(username, password, email)
        
        confidentialWallet.setKeyLabel( "public_key", "label")
        assert.equal( confidentialWallet.getKeyLabel("public_key"), "label" )
        
        //rename label
        confidentialWallet.setKeyLabel( "public_key", "label2" )
        assert.equal( confidentialWallet.getKeyLabel("public_key"), "label2" )
        
    })
    
    it('Blind accounts', ()=> {
        
        let create = ()=> confidentialWallet.createBlindAccount("a1", "brainkey")
        
        assert.deepEqual( confidentialWallet.getBlindAccounts().toJS(), {} )
        assert.throws(create , /locked/, "This test should require an unlocked wallet" )
        
        wallet.login(username, password, email)
        assert(create().Q, 'Needs to return a PublicKey')
        
        assert.throws(create, /label_exists/, "Expecting a 'label_exists' exception" )
        
        assert.deepEqual(
            confidentialWallet.getBlindAccounts().toJS(),
            { "a1":  PrivateKey.fromSeed("brainkey").toPublicKey().toString() }
        )
        
        assert.deepEqual(
            confidentialWallet.getMyBlindAccounts().toJS(),
            { "a1":  PrivateKey.fromSeed("brainkey").toPublicKey().toString() }
        )
    })
    
})