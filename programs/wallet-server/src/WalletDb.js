import crypto from "crypto"
import hash from "@graphene/hash"
import {Wallet} from "./db/models.js"
import {Signature, PrivateKey} from "@graphene/ecc"

export function createWallet(email, encrypted_data, signature) {
    let sig = Signature.fromBuffer(new Buffer(signature, 'hex'))
    
    console.log("sig.verifyBuffer(encrypted_data, PrivateKey.fromSeed('').toPublicKey())", sig.verifyBuffer(encrypted_data, PrivateKey.fromSeed("").toPublicKey()))

    console.log("hash.sha256(encrypted_data)", hash.sha256(encrypted_data).toString('hex'))
    let public_key = sig.recoverPublicKey(hash.sha256(encrypted_data))
    // let public_key = sig.recoverPublicKeyFromBuffer(new Buffer(encrypted_data, 'binary'))
    console.log("public_key.toPublicKeyString()", public_key.toPublicKeyString())
    
    let pubkey = "BTSabc"
    let hash_sha1 = hash.sha1(encrypted_data, 'base64')
    
    // email: { type: Sequelize.STRING, allowNull: false, unique: true },
    // pubkey: { type: Sequelize.STRING, allowNull: false, unique: true },
    // encrypted_data: { type: Sequelize.BLOB, allowNull: false },
    // signature: { type: Sequelize.STRING, allowNull: false },
    // hash_sha1: { type: Sequelize.STRING, allowNull: false }
    return Wallet.create({ email, pubkey, encrypted_data, signature, hash_sha1 })
        // don't return the entire wallet object, just return null
        .then( wallet => null )
}