import crypto from "crypto"
import hash from "@graphene/hash"
import {Wallet} from "./db/models.js"
import {Signature, PrivateKey} from "@graphene/ecc"

export function createWallet(email, encrypted_data, signature) {
    let sig = Signature.fromBuffer(new Buffer(signature, 'hex'))
    let public_key = sig.recoverPublicKeyFromBuffer(encrypted_data)
    if( ! sig.verifyBuffer(encrypted_data, public_key))
        return Promise.reject("signature_verify")

    let pubkey = public_key.toString()
    console.log("pubkey", pubkey)
    let hash_sha1 = hash.sha1(encrypted_data, 'base64')
    return Wallet.create({ email, pubkey, encrypted_data, signature, hash_sha1 })
        // don't return the entire wallet object, just return null
        .then( wallet => null )
}