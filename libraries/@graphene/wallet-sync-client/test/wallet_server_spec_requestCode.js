import assert from "assert"
import walletFetch from "../src/fetch"
import {PrivateKey} from "@graphene/ecc"
import WalletSyncServer from "../src/WalletSyncServer"

const host = process.env.npm_package_config_server_host
const port = process.env.npm_package_config_server_port

const server = new WalletSyncServer(host, port)

// Run expensive calculations here so the benchmarks in the unit tests will be accurate
const private_key = PrivateKey.fromSeed("")
const public_key = private_key.toPublicKey().toString()

describe('Email service', () => {

    it('requestCode', function(done) {
        let email = "alice@example.bitbucket"
        this.timeout(5000)
        server.requestCode(email, public_key).then(()=>{ done() })
            .catch( error =>{ console.error(error, error.stack); throw error })
    })
})

function assertRes(res, statusText) {
    assert.equal(res.statusText, statusText, res)
    return res
}