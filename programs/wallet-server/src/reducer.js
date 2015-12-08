import bs58 from "bs58"
import { checkToken } from "@graphene/time-token"
import emailToken from "./EmailToken"
import * as WalletSyncApi from './WalletSyncApi'
import * as WalletDb from "./WalletDb"
import {Wallet} from "./db/models.js"

export default function reducer(state, action) {
    if( /redux/.test(action.type) ) return state
    //console_error("reducer\t", action.type)
    let reply = action.reply
    try {
        switch( action.type ) {
            case 'requestCode':
                var { email } = action
                let p = emailToken(email)
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
                code = new Buffer( bs58.decode(code) ).toString( 'binary' )
                let result = checkToken( code )
                if( ! result.valid ) {
                    reply("Unauthorized", {message: result.error})
                    break
                }
                let email_from_seed = result.seed
                var r = WalletDb.createWallet(email_from_seed, encrypted_data, signature)
                reply(r)
                break
            case 'fetchWallet':
                var { public_key, local_hash } = action
                // let fetch_result = WalletDb.fetchWallet( public_key, local_hash )
                var r = Wallet
                    .findOne({ where: {public_key, local_hash: { $ne: local_hash } } })
                    .then
                ( wallet => {
                    if( ! wallet ) return "Not Modified"
                    let { email, public_key, signature, local_hash } = wallet
                    return {
                        email, public_key, signature, local_hash,
                        encrypted_data: wallet.encrypted_data.toString('base64'),
                    }
                })
                reply(r)
                break
            case 'saveWallet':
                var { encrypted_data, signature } = action
                var r = WalletDb.saveWallet(encrypted_data, signature)
                reply(r)
                break
            case 'changePassword':
                reply( WalletDb.changePassword(action) )
                break
            default:
                reply("Not Implemented")
        }
    } catch(error) {
        console_error(action.type, error, error.stack)
        reply.badRequest(error)
    }
    return state
}

var console_error = (...message) =>{ console.error("ERROR reducer", ...message) }
