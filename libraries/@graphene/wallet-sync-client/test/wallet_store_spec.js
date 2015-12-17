import assert from "assert"
import {createToken} from '@graphene/time-token'
import {Signature, PrivateKey, Aes} from "@graphene/ecc"
import hash from "@graphene/hash"
import WalletSyncApi from "../src/WalletSyncApi"
import secureRandom from "secure-random"

const host = process.env.npm_package_config_server_host
const port = process.env.npm_package_config_server_port

const server = new WalletSyncApi(host, port)

global.localStorage = require('localStorage')

/** These test may depend on each other.  For example: createWallet is the setup for fetchWallet, etc...  */
describe('Wallet store spec', () => {

    /** Ignore, this is clean up from a failed run */
    before( done =>{
        // let namespace = secureRandom(10, {type: 'Buffer'}).toString('hex')
        // new WalletSyncStorage(namespace, server)
        done()
    })

    // it('createWallet', done => {
    //     server.createWallet(code, encrypted_data, signature).then( json => done() )
    //         .catch( error =>{ console.error(error, error.stack); throw error })
    // })
    
})
// 
// /** Implementation my over-ride */
// setState(newState) {
//     let merged = this.state.merge(newState)
//     localStorage.setItem(this.namespace, merged.toJS())
//     this.state = merged
// }