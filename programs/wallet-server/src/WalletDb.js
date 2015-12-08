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
    let local_hash = hash.sha256(encrypted_data, 'base64')
    return Wallet.create({ email, public_key: pubkey, encrypted_data, signature, local_hash })
        // don't return the entire wallet object, just return null
        .then( wallet =>{ return {
            public_key: pubkey,
            local_hash
        } })
}

/**
    @arg {Buffer} encrypted_data - binary
    @arg {string} signature - hex
*/
export function saveWallet(encrypted_data, signature) {
    let sig = Signature.fromBuffer(new Buffer(signature, 'hex'))
    let public_key = sig.recoverPublicKeyFromBuffer(encrypted_data)
    if( ! sig.verifyBuffer(encrypted_data, public_key))
        return Promise.reject("signature_verify")

    let pubkey = public_key.toString()
    let local_hash = hash.sha256(encrypted_data, 'base64')
    return Wallet.findOne({where: {public_key: pubkey}}).then( wallet =>{
        wallet.encrypted_data = encrypted_data
        wallet.local_hash = local_hash
        return wallet.save().then( wallet => {
            return "OK"
        })
    })
}

export function changePassword({ original_local_hash, original_signature, new_encrypted_data, new_signature }) {
    let original_pubkey
    {
        let sig = Signature.fromBuffer(new Buffer(original_signature, 'hex'))
        let local_hash = new Buffer(original_local_hash, 'hex')
        let public_key = sig.recoverPublicKey(local_hash)
        if( ! sig.verifyHash(local_hash, public_key))
            return Promise.reject("signature_verify (original)")
        original_pubkey = public_key.toString()
    }
    let new_local_hash
    {
        let sig = Signature.fromBuffer(new Buffer(new_signature, 'hex'))
        let local_hash = hash.sha256(new_encrypted_data)
        let public_key = sig.recoverPublicKey(local_hash)
        if( ! sig.verifyHash(local_hash, public_key))
            return Promise.reject("signature_verify (new)")
        new_local_hash = local_hash
    }
    return Wallet.findOne({where: {public_key: original_pubkey}}).then( wallet =>{
        if( ! wallet ) return "Not Found"
        wallet.encrypted_data = new_encrypted_data
        wallet.local_hash = new_local_hash
        return wallet.save().then( wallet => {
            return "OK"
        })
    })
}