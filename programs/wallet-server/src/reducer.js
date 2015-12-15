import { checkToken } from "@graphene/time-token"
import emailToken from "./EmailToken"
import * as WalletDb from "./WalletDb"
import {Wallet} from "./db/models.js"
import hash from "@graphene/hash"

export default function reducer(state, action) {
    if( /redux/.test(action.type) ) return state
    // console_error("reducer\t", action.type)
    let reply = action.reply
    try {
        switch( action.type ) {
            case 'requestCode':
                var { email } = action
                // Embed the sha1 of the email, this is required to limit 1 wallet per email
                let p = emailToken(email, hash.sha1(email.trim().toLowerCase(), 'binary'))
                p.on('close', (code, signal) =>{
                    if( code === 0 ) {
                        reply.ok()
                        return
                    }
                    console_error("emailToken\tcode, signal, email", code, signal, email)
                    reply("Internal Server Error", {code})
                })
                break
            case 'createWallet':
                var { code, encrypted_data, signature } = action
                let result = checkToken( code )
                if( ! result.valid ) {
                    reply("Unauthorized", {message: result.error})
                    break
                }
                var email_sha1 = result.seed
                reply( WalletDb.createWallet(encrypted_data, signature, email_sha1) )
                break
            case 'fetchWallet':
                var { public_key, local_hash } = action
                local_hash = local_hash ? new Buffer(local_hash, 'binary').toString('base64') : ''
                var r = Wallet
                    .findOne({ where: {public_key, local_hash: { $ne: local_hash } } })
                    .then
                ( wallet => {
                    if( ! wallet ) return "Not Modified"
                    return {
                        encrypted_data: wallet.encrypted_data.toString('base64'),
                        created: wallet.createdAt, updated: wallet.updatedAt
                    }
                })
                reply(r)
                break
            case 'saveWallet':
                var { original_local_hash, encrypted_data, signature } = action
                reply( WalletDb.saveWallet(original_local_hash, encrypted_data, signature) )
                break
            case 'changePassword':
                reply( WalletDb.changePassword(action) )
                break
            case 'deleteWallet':
                reply( WalletDb.deleteWallet(action) )
                break
            default:
                reply("Not Implemented")
        }
    } catch(error) {
        console_error('ERROR', action.type, error, error.stack)
        reply.badRequest(error)
    }
    return state
}

var console_error = (...message) =>{ console.error("ERROR reducer", ...message) }
