import crypto from "crypto"
import Waterline from "waterline"

const adapter = "sails-memory"
// const adapter = "sails-mysql"
var sailsDbAdapter = require(adapter)

export function createWallet(encrypted_data, signature) {
    let pubkey = "BTSabc"
    let hash = crypto.createHash("sha1").update(encrypted_data).digest('binary')
    Wallet.create({ pubkey, encrypted_data, signature, hash })
        .then(wallet => { reply.ok({ id: wallet.id }) })
        .catch(error =>{
            console.error(error)
            reply("Internal Server Error", {error})
        })
}

var waterline = new Waterline()
var index = true, required = true
var walletCollection = Waterline.Collection.extend({
    identity: "wallet",
    connection: 'default',
    adapter,
    attributes: {
        pubkey: { type: 'string', required, index },
        encrypted_data: { type: 'binary', required },
        signature: { type: 'binary', required },
        hash: { type: 'binary', required }
    }
})
waterline.loadCollection(walletCollection)
var waterlineConfig = {
    adapters: { },
    connections: {
        default: { adapter }
    }
}
waterlineConfig.adapters[adapter] = sailsDbAdapter
var Wallet
waterline.initialize(waterlineConfig, (err, ontology) => {
    if (err) console.error(err)
    console.log("ontology", ontology)
    Wallet = ontology.collections.wallet
})

