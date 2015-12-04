import bs58 from "bs58"
import { checkToken } from "@graphene/time-token"
import emailToken from "./EmailToken"
import * as WalletSyncApi from './WalletSyncApi'
import * as WalletDb from "./WalletDb"

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
                WalletDb.createWallet(email_from_seed, encrypted_data, signature, resolve => {
                    if( resolve ) { reply.ok(); return }
                    console.log("resolve", resolve)
                })
                
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
