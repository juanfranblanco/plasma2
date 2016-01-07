import assert from "assert"
import walletFetch from "../src/fetch"
import {PrivateKey} from "@graphene/ecc"
import WalletApi from "../src/WalletApi"

const remote_url = process.env.npm_package_config_remote_url
var api = new WalletApi(remote_url)

// Run expensive calculations here so the benchmarks in the unit tests will be accurate
const private_key = PrivateKey.fromSeed("")
const public_key = private_key.toPublicKey().toString()

describe('Email API', () => {
    
    it('requestCode', function(done) {
        this.timeout(5000)
        let email = "alice@example.bitbucket"
        api.requestCode(email).then(()=>{ done() })
            .catch( error =>{ console.error(error, error.stack); throw error })
    })
    
})

/** These test may depend on each other.    */
describe('Email Actions', () => {

    it('requestCode', function(done) {
        let email = "alice@example.bitbucket"
        this.timeout(5000)
        err(api.requestCode(email).then( json =>{
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
