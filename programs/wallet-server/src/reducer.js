import bs58 from "bs58"
import * as WalletSyncApi from './WalletSyncApi'
import emailToken from "./EmailToken"
import { checkToken } from "@graphene/time-token"
import {Wallet} from "./db/models.js"

//const TRACE = true

export default function reducer(state, action) {
    if( /redux/.test(action.type) ) return state
    //console_error("reducer\t", action.type)
    let reply = action.reply
    try {
        switch( action.type ) {
            case 'requestCode':
                let { email } = action
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
                let { code, encrypted_data, signature } = action
                code = new Buffer( bs58.decode(code) ).toString( 'binary' )
                let result = checkToken( code )
                if( ! result.valid ) {
                    reply("Unauthorized", {message: result.error})
                    break
                }
                let email_from_seed = result.seed
                let pubkey = "BTSabc"
                let hash_sha1 = crypto.createHash("sha1").update(encrypted_data).digest('base64')
                Wallet.create({
                    email: email_from_seed,
                    pubkey: pubkey,
                    encrypted_data: encrypted_data,
                    signature: signature,
                    hash_sha1: hash_sha1
                })
                reply.ok(resolve)
                break
            default:
                reply("Not Implemented")
        }
    } catch(error) {
        console_error(action.type, error)
        reply.badRequest(error)
    }
    return state
}

var console_error = (...message) =>{ console.error("ERROR reducer", ...message) }
