import assert from "assert"
import {createToken} from '@graphene/time-token'
import {Signature, PrivateKey, Aes} from "@graphene/ecc"
import hash from "@graphene/hash"
import WalletSyncApi from "../src/WalletSyncApi"
import LocalStorageState from "../src/LocalStorageState"
import WalletSyncStorage from "../src/WalletSyncStorage"
import WalletSyncActions from "../src/WalletSyncActions"

const host = process.env.npm_package_config_server_host
const port = process.env.npm_package_config_server_port

// Configure to use localStorage for the purpose of these tests...
global.localStorage = require('localStorage')
const state = new LocalStorageState("wallet_action_spec")

var storage, api, actions

/** These test may depend on each other.    */
describe('Wallet store spec', () => {

    before( done =>{
        //  Clean up from a failed run 
        state.clear()
        api = new WalletSyncApi(host, port)
        storage = new WalletSyncStorage(state.reducer())
        actions = new WalletSyncActions(api, storage)
        done()
    })

    
    
})
function err(p) { p.catch(error => console.error(error, error.stack)) }