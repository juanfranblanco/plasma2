import assert from "assert"
import walletFetch from "../src/fetch"
import {PrivateKey} from "@graphene/ecc"
import * as WalletSyncApi from "../src/WalletSyncApi"

const host = process.env.npm_package_config_server_host
const port = process.env.npm_package_config_server_port

describe('Email service', () => {

    it('requestCode', function(done) {
        let email = "alice@example.bitbucket"
        let public_key = PrivateKey.fromSeed("").toPublicKey().toString()
        let action = WalletSyncApi.requestCode({ email, public_key: public_key.toString() })
        this.timeout(5000)
        walletFetch(host, port, action).then( res =>{ assertRes(res, "OK"); done() })
            .catch( error =>{ console.error(error, error.stack); throw error })
    })

})

function assertRes(res, statusText) {
    assert.equal(res.statusText, statusText)
    return res
}
