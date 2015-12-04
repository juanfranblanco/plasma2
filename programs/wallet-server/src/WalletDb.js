import crypto from "crypto"
import hash from "@graphene/hash"
import {Wallet} from "./db/models.js"

export function createWallet(email, encrypted_data, signature, resolve) {
    let pubkey = "BTSabc"
    let hash_sha1 = hash.sha1(encrypted_data, 'base64')
    Wallet
        .create({ email, pubkey, encrypted_data, signature, hash_sha1 })
        .then(()=>{ resolve(true) })
        .catch( error => {
            resolve({
                error: validation_error.message,
                errors: validation_error.errors
            })
        })
}
// email: { type: Sequelize.STRING, allowNull: false, unique: true },
// pubkey: { type: Sequelize.STRING, allowNull: false, unique: true },
// encrypted_data: { type: Sequelize.BLOB, allowNull: false },
// signature: { type: Sequelize.STRING, allowNull: false },
// hash_sha1: { type: Sequelize.STRING, allowNull: false }