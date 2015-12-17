import assert from "assert"
import walletFetch from "../src/fetch"
import {PrivateKey} from "@graphene/ecc"
import WalletSyncApi from "../src/WalletSyncApi"
import LocalStorageState from "../src/LocalStorageState"
import WalletSyncStorage from "../src/WalletSyncStorage"
import WalletSyncActions from "../src/WalletSyncActions"

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
const state = new LocalStorageState("wallet_store_spec")
var storage, api, actions

/** These test may depend on each other.    */
describe('Email Actions', () => {

    before( done =>{
        //  Clean up from a failed run 
        state.clear()
        api = new WalletSyncApi(host, port)
        storage = new WalletSyncStorage(state.reducer())
        actions = new WalletSyncActions(api, storage)
        done()
    })

    it('emailCode', function(done) {
        let email = "alice@example.bitbucket"
        this.timeout(5000)
        err(actions.emailCode(email).then( ()=>{
            assert(storage.state.get("code_expiration_date"), 'code_expiration_date')
            done()
        }))
    })
    
})

function err(p) { p.catch(error => console.error(error, error.stack)) }
function assertRes(res, statusText) {
    assert.equal(res.statusText, statusText, res)
    return res
}
