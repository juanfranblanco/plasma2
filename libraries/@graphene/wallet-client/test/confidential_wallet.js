import assert from "assert"
import { Map, List } from "immutable"
import { PublicKey, PrivateKey, hash } from "@graphene/ecc"
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

let wallet, cw
let create = (name = "a1", brainkey = "brainkey")=> cw.createBlindAccount(name, brainkey)

function initWallet() {
    storage.clear()
    wallet = new WalletStorage(storage)
    cw = new ConfidentialWallet(wallet)
}

describe('Confidential Wallet', () => {
    
    beforeEach(()=> initWallet())
    
    // Establish connection fully, obtain Chain ID
    before(()=> Apis.instance("ws://localhost:8090").init_promise)
    
    // afterEach(()=> wallet.logout())

    it('Keys', ()=> {
        
        wallet.login(username, password, email, Apis.chainId())
        
        let public_key = PrivateKey.fromSeed("").toPublicKey().toString()
        
        assert( cw.setKeyLabel( public_key, "label"), "add key and label")
        assert.equal( cw.getKeyLabel(public_key), "label" )
        
        assert( cw.setKeyLabel( public_key, "label2" ), "rename label")
        assert.equal( cw.getKeyLabel(public_key), "label2" )
        assert( ! cw.setKeyLabel( "public_key2", "label2"), "label already assigned")
        
        assert.equal( cw.getKeyLabel(public_key), "label2", "fetch label")
        assert.equal( cw.getPublicKey("label2"), public_key, "fetch key")
        
        {
            let key = PrivateKey.fromSeed("seed")
            assert( cw.setKeyLabel( key, "seed label" ), "add unlabeled private key")
            assert.equal(wallet.wallet_object
                .getIn( ["keys", key.toPublicKey().toString()] )
                .get("private_wif"), key.toWif())
            assert( cw.getPrivateKey( key.toPublicKey() ))
            assert( cw.getPrivateKey( key.toPublicKey().toString() ))
            assert( cw.getPrivateKey( "seed label" ))
        }
        
        assert( cw.getKeyLabel("") === null, "fetch label should return null")
        assert( cw.getPublicKey("") === null, "fetch key should return null")
    })
    
    it('Accounts', ()=> {
        
        assert.throws(create, /login/, "This test should require an unlocked wallet" )
        
        // unlock
        wallet.login(username, password, email, Apis.chainId())
        
        assert.deepEqual( cw.getBlindAccounts().toJS(), {} )
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
        assert.equal(
            create("bob", "bob-brain-key").toString(),
            "GPH8HosMbp7tL614bFgqtXXownHykqASxwmnH9NrhAnvtTuVWRf1X",
            "Match against a known public key (matching the graphene cli wallet)"
        )
        
    })
    
    it("Transfer", ()=> {
        
        wallet.login(username, password, email, Apis.chainId())
        
        create("alice", "alice-brain-key")
        create("bob", "bob-brain-key")
        let key = PrivateKey.fromSeed("")
        cw.setKeyLabel( PrivateKey.fromSeed("nathan") )
        
        return cw.transferToBlind( "nathan", "CORE", [["alice",1],["bob",1]], true ).then( tx =>{
            if( tx ) console.log("tx", JSON.stringify(tx))
        })
        
    })
    
    
    it("Crypto matches witness_node", ()=> {
        let one_time_private = PrivateKey.fromHex("8fdfdde486f696fd7c6313325e14d3ff0c34b6e2c390d1944cbfe150f4457168")
        let to_public = PublicKey.fromStringOrThrow("GPH7vbxtK1WaZqXsiCHPcjVFBewVj8HFRd5Z5XZDpN6Pvb2dZcMqK")
        let secret = one_time_private.get_shared_secret( to_public )
        let child = hash.sha256( secret )
        
        // Check everything above with `wdump((child));` from the witness_node:
        assert.equal(child.toString('hex'), "1f296fa48172d9af63ef3fb6da8e369e6cc33c1fb7c164207a3549b39e8ef698")
        
        let nonce = hash.sha256( one_time_private.toBuffer() )
        assert.equal(nonce.toString('hex'), "462f6c19ece033b5a3dba09f1e1d7935a5302e4d1eac0a84489cdc8339233fbf")
        
        // let blind_factor = hash.sha256( child )
        
        
        
        // let auth_public = to_public.child( child )
        // assert.equal(auth_public.toString(), "GPH6XA72XARQCain961PCJnXiKYdEMrndNGago2PV5bcUiVyzJ6iL")
    })
        
    
})