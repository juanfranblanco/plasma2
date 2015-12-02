import * as WalletSyncApi from './WalletSyncApi'
import emailToken from "./EmailToken"
import { checkToken } from "@graphene/time-token"
import * as WalletDb from "./WalletDb"

//const TRACE = true

export default function reducer(state, action) {
    if( /redux/.test(action.type) ) return state
    //console_error("reducer\t", action.type)
    let reply = action.reply
    switch( action.type ) {
        case 'requestCode':
            let { email } = action.values
            if( invalidEmail(email) ) {
                reply.badRequest("invalid email", { email })
                break
            }
            let p = emailToken(email, false)
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
            // let result = checkToken( code )
            // if( ! result.valid ) {
            //     reply("Unauthorized", {message: result.error})
            //     break
            // }
            try {
                WalletDb.createWallet(encrypted_data, signature)
                reply.ok()
            } catch(error) {
                console_error("createWallet", error)
                reply.badRequest(error)
            }
            break
        default:
            reply("Not Implemented")
    }
    return state
}

var console_error = (...message) =>{ console.error("ERROR reducer", ...message) }

// No spaces, only one @ symbol, any character for the email name (not completely complient but safe),
// only valid domain name characters...  Single letter domain is allowed, top level domain has at
// least 2 characters.
var invalidEmail = email => ! email || ! /^[^ ^@.]+@[a-z0-9][\.a-z0-9_-]*\.[a-z0-9]{2,}$/i.test( email )

