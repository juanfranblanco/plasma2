import crypto from "crypto"
import * as WaterlineDb from "./WaterlineDb"

export function createWallet(email, encrypted_data, signature, resolve) {
    WaterlineDb.instance( ontology => {
        var Wallet = ontology.collections.wallet
        let pubkey = "BTSabc"
        let hash = crypto.createHash("sha1").update(encrypted_data).digest('binary')
        Wallet.create({ email, pubkey, encrypted_data, signature, hash })
            .then(wallet =>{ resolve({ id: wallet.id }) })
            .catch(error =>{ throw error })
    })
}
// email: { type: string, required, unique, index },
// pubkey: { type: 'binary', required, unique, index },
// encrypted_data: { type: 'binary', required },
// signature: { type: 'binary', required },
// hash_sha1: { type: 'binary', required, size: 20 }