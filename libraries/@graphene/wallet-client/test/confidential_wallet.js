// import {Map} from "immutable"
// import {encrypt, decrypt } from "../src/WalletActions"
// import {createToken} from '@graphene/time-token'
// import WebSocketRpc from "../src/WebSocketRpc"
// import WalletApi from "../src/WalletApi"
import assert from "assert"
import {PublicKey } from "@graphene/ecc"
import LocalStoragePersistence from "../src/LocalStoragePersistence"

import Wallet from "../src/Wallet"
import ConfidentialWallet from "../src/ConfidentialWallet"

const username = "username"
const password = "password"
const email = "alice_spec@example.bitbucket"
// const code = createToken(hash.sha1(email, 'binary'))
// const remote_url = process.env.npm_package_config_remote_url

// Configure to use localStorage for the purpose of these tests...
global.localStorage = require('localStorage')
const storage = new LocalStoragePersistence("wallet_spec")

describe('Confidential Wallet', () => {
    
    var wallet, confidentialWallet

    function initWallet() {
        storage.clear()
        wallet = new Wallet(storage)
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
    
    it('Create blind account', ()=> {
        
        let create = ()=> confidentialWallet.createBlindAccount("a1", "brainkey")
        
        assert.throws(create , /locked/, "This test should require an unlocked wallet" )
        
        wallet.login(username, password, email)
        assert(create().Q, 'Needs to return a PublicKey')
        
        assert.throws(create, /label_exists/ )
        
    })
    
})