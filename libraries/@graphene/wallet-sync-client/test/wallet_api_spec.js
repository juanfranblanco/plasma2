import assert from "assert"
import {createToken} from '@graphene/time-token'
import {Signature, PrivateKey, Aes, hash} from "@graphene/ecc"
import FormData from "form-data"
import WalletApi from "../src/WalletApi"

const host = process.env.npm_package_config_server_host
const port = process.env.npm_package_config_server_port

const server = new WalletApi(host, port)

// Run expensive calculations here so the benchmarks in the unit tests will be accurate
const private_key = PrivateKey.fromSeed("")
const public_key = private_key.toPublicKey().toString()
const code = createToken(hash.sha1("alice@example.bitbucket", 'binary'))
const encrypted_data = Aes.fromSeed("").encrypt("data")
const local_hash = hash.sha256(encrypted_data)
const signature = Signature.signBufferSha256(local_hash, private_key)

const private_key2 = PrivateKey.fromSeed("2")
const public_key2 = private_key2.toPublicKey().toString()
const encrypted_data2 = Aes.fromSeed("").encrypt("data2")
const local_hash2 = hash.sha256(encrypted_data2)
const signature2 = Signature.signBufferSha256(local_hash2, private_key2)
const signature_key1_enc2 = Signature.signBufferSha256(local_hash2, private_key)

/** These test may depend on each other.  For example: createWallet is the setup for fetchWallet, etc...  */
describe('Wallet API client', () => {

    /** Ignore, this is clean up from a failed run */
    before( done =>{
        var p1 = deleteWallet("", "data")
        var p2 = deleteWallet("2", "data2")
        Promise.all([ p1, p2 ])
            .catch(error =>{
                if(error.res.statusText !== "Not Found" && error.res.statusText !== "OK")
                    console.error(error, error.stack)
            })
            .then(()=> done() )
    })

    it('createWallet', done => {
        server.createWallet(code, encrypted_data, signature).then( json => done() )
            .catch( error =>{ console.error(error, error.stack); throw error })
    })
    
    it('createWallet (duplicate)', done => {
        // Ensure the same email can't be used twice.
        // Try to create a new wallet with the same code (email)
        server.createWallet(code, encrypted_data2, signature2)
            .catch( error =>{
                assertRes(error.res, "Bad Request")
                assert(error.cause.message === "Validation error", 'error.cause.message === "Validation error"')
                done()
            })
            .catch( error => console.error(error, error.stack) )
    })

    it('fetchWallet (Recovery)', done => {
        let local_hash = null // recovery, the local_hash is not known
        server.fetchWallet(public_key, local_hash)
            .then( json => {
                assertRes(json, "OK")
                assert(json.encrypted_data, encrypted_data.toString('base64'), 'encrypted_data')
                done()
            })
            .catch( error => console.error(error, error.stack) )
    })

    it('fetchWallet (Not Modified)', done => {
        server.fetchWallet(public_key, local_hash)
            .then( json => { assertRes(json, 'Not Modified'); done() })
            .catch( error => console.error(error, error.stack) )
    })
    
    it('fetchWallet (Not Exist)', done => {
        server.fetchWallet(public_key2, local_hash2)
            .then( json => { assertRes(json, 'No Content'); done() })
            .catch( error => console.error(error, error.stack) )
    })
    
    it('saveWallet', done => {
        server.saveWallet( local_hash, encrypted_data2, signature_key1_enc2 ).then( json =>{
            assert.equal(json.local_hash, local_hash2.toString('base64'), 'local_hash')
            assert(json.updated, 'updated')
            done()
        }).catch( error =>{ console.error(error, error.stack); throw error })
    })

    it('saveWallet (Conflict)', done => {
        // original hash will not match
        server.saveWallet( local_hash, encrypted_data2, signature_key1_enc2 )
            .catch( error =>{ if(error.res.statusText === 'Conflict') done()
                else console.log(error, error.stack) })
    })
    
    it('saveWallet (Unknown key)', done => {
        // The "2" key is not on the server yet
        server.saveWallet( local_hash2, encrypted_data2, signature2 )
            .catch( error =>{ if(error.res.statusText === 'Not Found') done()
                else console.log(error, error.stack) })
    })
    
    it('changePassword', done => {
        server.changePassword( local_hash, signature, encrypted_data2, signature2 ).then( json => {
            assert.equal(json.local_hash, local_hash2.toString('base64'), 'local_hash')
            assert(json.updated, 'updated')
            done()
        })
        .catch( error =>{ console.error(error); throw error })
    })
    
    /** End of the wallet tests, clean-up... */
    it('deleteWallet', done=>{
        deleteWallet("2", "data2").then(() =>{ done() })
            .catch( error =>{ console.error(error); throw error })
    })

})

function deleteWallet(private_key_seed, wallet_data) {
    let private_key = PrivateKey.fromSeed(private_key_seed)
    let encrypted_data = Aes.fromSeed(private_key_seed).encrypt(wallet_data)
    let local_hash = hash.sha256(encrypted_data)
    let signature = Signature.signBufferSha256(local_hash, private_key)
    return server.deleteWallet( local_hash, signature )
}

function assertRes(res, statusText) {
    assert.equal(res.statusText, statusText, res)
    return res
}