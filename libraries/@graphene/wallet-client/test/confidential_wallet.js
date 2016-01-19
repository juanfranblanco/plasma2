import assert from "assert"
import { PublicKey, PrivateKey } from "@graphene/ecc"
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
    
    var wallet, cw

    function initWallet() {
        storage.clear()
        wallet = new WalletStorage(storage)
        cw = new ConfidentialWallet(wallet)
    }
    
    beforeEach(()=>{
        initWallet()
    })
    
    // afterEach(()=> wallet.logout())

    it('Key labels', ()=> {
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
    
    it('Blind accounts', ()=> {
        
        let create = ()=> cw.createBlindAccount("a1", "brainkey")
        
        assert.deepEqual( cw.getBlindAccounts().toJS(), {} )
        assert.throws(create, /locked/, "This test should require an unlocked wallet" )
        
        wallet.login(username, password, email)
        assert(create().Q, 'Needs to return a PublicKey')
        
        assert.throws(create, /label_exists/, "Expecting a 'label_exists' exception" )
        
        assert.deepEqual(
            cw.getBlindAccounts().toJS(),
            { "a1":  PrivateKey.fromSeed("brainkey").toPublicKey().toString() }
        )
        
        assert.deepEqual(
            cw.getMyBlindAccounts().toJS(),
            { "a1":  PrivateKey.fromSeed("brainkey").toPublicKey().toString() }
        )
    })
    
})