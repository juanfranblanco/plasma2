import nodeFetch from "node-fetch"
import FormData from "form-data"

/**
    @arg {string} remote_url - http://localhost:9080
    @arg {object} action - Action obtained from {@link ./actions.js}
    @return {Promise} res - expressjs response object
*/
export default function fetch(remote_url, action) {
    if( ! action.type ) throw new Error("Action parameter missing action.type (see ./WalletApi.js")
    let body = new FormData()
    for(let f in action) {
        if( f === 'type' ) continue
        let value = action[f]
        if( value == null) continue
        // console.log("f,action[f]", f,action[f])
        body.append(f, value)
    }
    return nodeFetch( remote_url + "/" + action.type, { method: 'POST', body })
        // .catch( error =>{ console.error("ERROR nodeFetch", error, 'stack', error.stack); throw error })
}