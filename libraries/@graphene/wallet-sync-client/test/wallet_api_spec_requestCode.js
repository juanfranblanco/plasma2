import assert from "assert"
import walletFetch from "../src/fetch"
import {PrivateKey} from "@graphene/ecc"
import WalletSyncApi from "../src/WalletSyncApi"
import LocalStoragePersistence from "../src/LocalStoragePersistence"
import WalletState from "../src/WalletState"
import Wallet from "../src/Wallet"

const host = process.env.npm_package_config_server_host
const port = process.env.npm_package_config_server_port

const server = new WalletSyncApi(host, port)

// Run expensive calculations here so the benchmarks in the unit tests will be accurate
const private_key = PrivateKey.fromSeed("")
const public_key = private_key.toPublicKey().toString()

describe('Email API', () => {
    it('requestCode', function(done) {
        this.timeout(5000)
        let email = "alice@example.bitbucket"
        server.requestCode(email).then(()=>{ done() })
            .catch( error =>{ console.error(error, error.stack); throw error })
    })
})


// Configure to use localStorage for the purpose of these tests...
global.localStorage = require('localStorage')
const storage = new LocalStoragePersistence("wallet_store_spec")
var storage, api, wallet

/** These test may depend on each other.    */
describe('Email Actions', () => {

    before( done =>{
        //  Clean up from a failed run 
        storage.clear()
        api = new WalletSyncApi(host, port)
        state = new WalletState(storage.persister())
        wallet = new Wallet(api, state)
        done()
    })

    it('emailCode', function(done) {
        let email = "alice@example.bitbucket"
        this.timeout(5000)
        err(api.emailCode(email).then( ()=>{
            assert(state.state.get("code_expiration_date"), 'code_expiration_date')
            done()
        }))
    })
    
})

function err(p) { p.catch(error => console.error(error, error.stack)) }
function assertRes(res, statusText) {
    assert.equal(res.statusText, statusText, res)
    return res
}
