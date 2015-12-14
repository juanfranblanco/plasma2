import assert from "assert"
import walletFetch from "../src/fetch"
import {PrivateKey} from "@graphene/ecc"
import WalletSyncServer from "../src/WalletSyncServer"

const host = process.env.npm_package_config_server_host
const port = process.env.npm_package_config_server_port

const server = new WalletSyncServer(host, port)

describe('Email service', () => {

    it('requestCode', function(done) {
        let email = "alice@example.bitbucket"
        let public_key = PrivateKey.fromSeed("").toPublicKey().toString()
        this.timeout(5000)
        server.requestCode(email, public_key).then(()=>{ done() })
            .catch( error =>{ console.error(error, error.stack); throw error })
    })

})

function assertRes(res, statusText) {
    assert.equal(res.statusText, statusText)
    return res
}