import * as WalletSyncApi from './WalletSyncApi'
import emailToken from "./EmailToken"
import { checkToken } from "@graphene/time-token"
import * as WalletDb from "./WalletDb"

//const TRACE = true

export default function reducer(state, action) {
    if( /redux/.test(action.type) ) return state
    //console_error("reducer\t", action.type)
    let reply = action.reply
    try {
        switch( action.type ) {
            case 'requestCode':
                let { email } = action
                let p = emailToken(email, true)
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
                let result = checkToken( code )
                if( ! result.valid ) {
                    reply("Unauthorized", {message: result.error})
                    break
                }
                WalletDb.createWallet(result.email, encrypted_data, signature,
                    resolve =>{ reply.ok(resolve) })
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
