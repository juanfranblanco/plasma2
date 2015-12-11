import assert from "assert"
import {createToken} from '@graphene/time-token'
import {Signature, PrivateKey, Aes} from "@graphene/ecc"
import hash from "@graphene/hash"
import FormData from "form-data"
import bs58 from "bs58"
import walletFetch from "../src/fetch"
import * as WalletSyncApi from "../src/WalletSyncApi"

const port = process.env.npm_package_config_server_port
const host = process.env.npm_package_config_server_host

/** These test may depend on each other.  For example: createWallet is the setup for walletFetchWallet, etc...  */
describe('Wallet sync client', () => {

    before( done =>{
        // clean up from a failed run
        deleteWallet("", "data").then(
            ()=> deleteWallet("2", "data2").then(
                ()=>{ done() } ) )
    })

    it('createWallet', done => {
        let private_key = PrivateKey.fromSeed("")
        let code = createToken(private_key.toPublicKey().toString())
        let encrypted_data = Aes.fromSeed("").encrypt("data")
        let signature = Signature.signBuffer(encrypted_data, private_key)
        let action = WalletSyncApi.createWallet({ code, encrypted_data, signature })
        walletFetch(host, port, action).then( res => assertRes(res, "OK").json() ).then( json => {
            assert.equal(json.local_hash, hash.sha256(encrypted_data, 'base64'), 'local_hash')
            assert(new Date(json.created), 'created')
            done()
        })
        .catch( error =>{ console.error(error); throw error })
    })

    it('fetchWallet (Recovery)', done => {
        let public_key = PrivateKey.fromSeed("").toPublicKey().toString()
        let local_hash = null // recovery, the local_hash is not known
        let action = WalletSyncApi.fetchWallet({ public_key, local_hash })
        walletFetch(host, port, action).then( res => assertRes(res, "OK").json() ).then( json => {
            let encrypted_data = Aes.fromSeed("").encrypt("data").toString('base64')
            assert.equal(encrypted_data, json.encrypted_data, 'encrypted_data')
            assert(new Date(json.created), 'created')
            assert(new Date(json.updated), 'updated')
            done()
        })
        .catch( error =>{ console.error(error, error.stack); throw error })
    })
    
    it('fetchWallet (Not Modified)', done => {
        let public_key = PrivateKey.fromSeed("").toPublicKey().toString()
        let encrypted_data = Aes.fromSeed("").encrypt("data")
        let local_hash = hash.sha256(encrypted_data)
        let action = WalletSyncApi.fetchWallet({ public_key, local_hash })
        walletFetch(host, port, action).then( res =>{ assertRes(res, "Not Modified"); done() })
            .catch( error =>{ console.error(error, error.stack); throw error })
    })
    
    it('saveWallet', done => {
        let original_local_hash = hash.sha256(Aes.fromSeed("").encrypt("data"))
        let private_key = PrivateKey.fromSeed("")
        let encrypted_data = Aes.fromSeed("").encrypt("data2")
        let signature = Signature.signBuffer(encrypted_data, private_key)
        let action = WalletSyncApi.saveWallet({ original_local_hash, encrypted_data, signature })
        walletFetch(host, port, action).then( res => assertRes(res, "OK" ).json() ).then( json => {
            assert.equal(json.local_hash, hash.sha256(encrypted_data, 'base64'), 'local_hash')
            assert(json.updated, 'updated')
            done()
        })
        .catch( error =>{ console.error(error); throw error })
    })

    it('saveWallet (Conflict)', done => {
        // original hash will not match
        let original_local_hash = hash.sha256(Aes.fromSeed("").encrypt("Conflict"))
        let private_key = PrivateKey.fromSeed("")
        let encrypted_data = Aes.fromSeed("").encrypt("data2")
        let signature = Signature.signBuffer(encrypted_data, private_key)
        let action = WalletSyncApi.saveWallet({ original_local_hash, encrypted_data, signature })
        walletFetch(host, port, action).then( res =>{ assertRes(res, "Conflict" ); done() })
            .catch( error =>{ console.error(error); throw error })
    })

    it('saveWallet (Unknown key)', done => {
        // change "nobody" to "" and it should pass (should match createWallet's private key)
        let private_key = PrivateKey.fromSeed("nobody")
        let original_local_hash = hash.sha256(Aes.fromSeed("").encrypt("data2"))
        let encrypted_data = Aes.fromSeed("").encrypt("data2")
        let signature = Signature.signBuffer(encrypted_data, private_key)
        let action = WalletSyncApi.saveWallet({ original_local_hash, encrypted_data, signature })
        walletFetch(host, port, action).then( res =>{ assertRes(res, "Bad Request" ); done() })
            .catch( error =>{ console.error(error); throw error })
    })

    it('changePassword', done => {
        let original_private_key =  PrivateKey.fromSeed("")
        let original_encrypted_data = Aes.fromSeed("").encrypt("data2")
        let original_local_hash = hash.sha256(original_encrypted_data)
        let original_signature = Signature.signBufferSha256(original_local_hash, original_private_key)
        let new_private_key = PrivateKey.fromSeed("2")
        let new_encrypted_data =  Aes.fromSeed("2").encrypt("data2")
        let new_signature = Signature.signBuffer(new_encrypted_data, new_private_key)
        let action = WalletSyncApi.changePassword({
            original_local_hash, original_signature, new_encrypted_data, new_signature
        })
        walletFetch(host, port, action).then( res => assertRes(res, "OK" ).json() ).then( json => {
            assert.equal(json.local_hash, hash.sha256(new_encrypted_data, 'base64'), 'local_hash')
            assert(json.updated, 'updated')
            done()
        })
        .catch( error =>{ console.error(error); throw error })
    })

    /** End of the wallet tests, clean-up... */
    it('deleteWallet', done=>{
        let private_key = PrivateKey.fromSeed("2")
        let encrypted_data = Aes.fromSeed("2").encrypt("data2")
        let local_hash = hash.sha256(encrypted_data)
        let sig = Signature.signBufferSha256(local_hash, private_key)
        deleteWallet("2", "data2").then(res =>{ assertRes(res, "OK" ); done() })
    })

})

function deleteWallet(private_key_seed, wallet_data) {
    let private_key = PrivateKey.fromSeed(private_key_seed)
    let encrypted_data = Aes.fromSeed(private_key_seed).encrypt(wallet_data)
    let local_hash = hash.sha256(encrypted_data)
    let signature = Signature.signBufferSha256(local_hash, private_key)
    return walletFetch(host, port, WalletSyncApi.deleteWallet({ local_hash, signature }))
}


function assertRes(res, statusText) {
    assert.equal(res.statusText, statusText)
    return res
}