import * as WalletSyncApi from './WalletSyncApi'
import emailToken from "./EmailToken"

export default function reducer(state, action) {
    if( /redux/.test(action.type) ) return state
    console.log("Reducer\t", action.type)
    switch( action.type ) {
        case 'requestCode':
            let p = emailToken(action.email)
            p.on('close', (code, signal) =>{
                console.log("code, signal", code, signal)
                if( code === 0 ) {
                    action.rest_api.ok()
                    return
                }
                action.rest_api.response("Internal Server Error", {code})
            })
            return
        
        default:
            action.rest_api.response("Not Implemented")
            return state
    }
    return state
}