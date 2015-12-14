import nodeFetch from "node-fetch"
import FormData from "form-data"

/**
    @arg {object} action - Action obtained from {@link ./actions.js}
    @return {Promise} res - expressjs response object
*/
export default function fetch(host, port, action) {
    if( ! action.type ) throw new Error("Action parameter missing action.type (see ./WalletSyncApi.js")
    let body = new FormData()
    for(let f in action) {
        if( f === 'type' ) continue
        let value = action[f]
        if( value == null) continue
        // console.log("f,action[f]", f,action[f])
        body.append(f, value)
    }
    return nodeFetch( "http://" + host + ":" + port + "/" + action.type, { method: 'POST', body })
        // .then( res => { try {return res.json()} catch(e) { return res } })
        .catch( error =>{ console.error("fetch", error, error.stack); throw error })
}