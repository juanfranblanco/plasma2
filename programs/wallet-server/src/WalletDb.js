import crypto from "crypto"
import hash from "@graphene/hash"
import {Wallet} from "./db/models.js"
import {Signature, PrivateKey} from "@graphene/ecc"

/**
    @arg {string} email
    @arg {Buffer} encrypted_data - binary
    @arg {string} signature - hex
*/
export function createWallet(email, encrypted_data, signature) {
    let sig = Signature.fromBuffer(new Buffer(signature, 'hex'))
    let public_key = sig.recoverPublicKeyFromBuffer(encrypted_data)
    if( ! sig.verifyBuffer(encrypted_data, public_key))
        return Promise.reject("signature_verify")

    let pubkey = public_key.toString()
    let local_hash = hash.sha1(encrypted_data, 'base64')
    return Wallet.create({ email, public_key: pubkey, encrypted_data, signature, local_hash })
        // don't return the entire wallet object, just return null
        .then( wallet =>{ return {
            public_key: pubkey,
            local_hash
        } })
}