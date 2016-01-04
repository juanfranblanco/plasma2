import assert from "assert"
import walletFetch from "../src/fetch"
import {PrivateKey} from "@graphene/ecc"
import WalletApi from "../src/WalletApi"
import LocalStoragePersistence from "../src/LocalStoragePersistence"
import WalletState from "../src/WalletState"
import Wallet from "../src/Wallet"

// Configure to use localStorage for the purpose of these tests...
global.localStorage = require('localStorage')
const storage = new LocalStoragePersistence("wallet_store_spec_v2")
var wallet = new Wallet(storage)

// Run expensive calculations here so the benchmarks in the unit tests will be accurate
const private_key = PrivateKey.fromSeed("")
const public_key = private_key.toPublicKey().toString()

describe('Email API', () => {
    it('requestCode', function(done) {
        this.timeout(5000)
        let email = "alice@example.bitbucket"
        wallet.api.requestCode(email).then(()=>{ done() })
            .catch( error =>{ console.error(error, error.stack); throw error })
    })
})

/** These test may depend on each other.    */
describe('Email Actions', () => {

    before( done =>{
        //  Clean up from a failed run 
        storage.clear()
        wallet = new Wallet(storage)  
        done()
    })

    it('requestCode', function(done) {
        let email = "alice@example.bitbucket"
        this.timeout(5000)
        err(wallet.api.requestCode(email).then( json =>{
            assert(json.expire_min, 'expire_min')
            done()
        }))
    })

})

function err(p) { p.catch(error => console.error(error, error.stack)) }
function assertRes(res, statusText) {
    assert.equal(res.statusText, statusText, res)
    return res
}
