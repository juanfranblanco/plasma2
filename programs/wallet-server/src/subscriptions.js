import { Map } from "immutable"

let subscriptions = Map()

/**
    @arg {WebSocket} ws
    @arg {string} method
    @arg {object} subscribe_key
    @arg {string} subscribe_id
    @return {boolean} success or false for duplicate subscription
*/
export function subscribe(ws, method, subscribe_key, subscribe_id) {
    let success = false
    subscribe_id = String(subscribe_id)
    
    subscriptions = subscriptions
        .updateIn([method, subscribe_key, ws], Map(), subscribe_map =>{
            if( subscribe_map.has(subscribe_id) ) {
                console.log("WARN\tsubscriptions\tAlready subscribed", subscribe_id);
                return subscribe_map
            }
            success = true
            return subscribe_map.set(subscribe_id, subscribe_id)
        })
    return success
}

/** 
    @arg {WebSocket} ws
    @arg {string} method
    @arg {object} subscribe_key
    @arg {string} unsubscribe_id
    @return {boolean} success or false when not subscription
*/
export function unsubscribe(ws, method, subscribe_key, unsubscribe_id) {
    let success = false
    unsubscribe_id = String(unsubscribe_id)
    subscriptions = subscriptions
        .updateIn([method, subscribe_key, ws], Map(), subscribe_map =>{
            if( ! subscribe_map.has(unsubscribe_id) ) {
                console.log("WARN\tsubscriptions\tNot subscribed", unsubscribe_id);
                return subscribe_map
            }
            success = true
            return subscribe_map.remove(unsubscribe_id)
        })
    return success
}

/** 
    Notify ALL web sockets except arg1
    @arg {WebSocket} ws
    @arg {string} method
    @arg {object} subscribe_key
    @arg {object} params
*/
export function notifyOther(ws, method, subscribe_key, params) {
    
    let ws_map = subscriptions.getIn([method, subscribe_key])
    if( ! ws_map )
        return
    
    ws_map.forEach( (ids, subscribe_ws) => {
        // don't notify yourself
        if( ws === subscribe_ws )
            return
        
        ids.forEach( subscription_id => {
            try {
                console.log("INFO\tsubscriptions\tnotify", subscription_id, subscribe_key, method, params)
                subscribe_ws.send(JSON.stringify({
                    method: "notice",
                    params: [subscription_id, params]
                }))
            } catch( error ) {
                console.log("ERROR\tsubscriptions\tnotify", error, "stack", error.stack)
            }
        })
    })
}

export var count = ()=> {
    let cnt = 0
    subscriptions
        .forEach( (subscribe_key, method) => subscribe_key
        .forEach( (subscribe_map, ws) => cnt += subscribe_map.count()
    ))
    return cnt
}

export function remove(ws) {
    subscriptions = subscriptions
        .filterNot( (subscribe_key, method)=> subscribe_key
            .filter( (subscribe_map, subscribe_ws)=> {
                let match = subscribe_ws === ws
                if( match && ! subscribe_map.isEmpty()) {
                    console.error("WARN\tsubscriptions\tWebSocket closed with active subscription(s)", subscribe_map.keySeq().toJS())
                }
                return match
            }
        ).isEmpty()
    )
}

// export function getSubscriptionMap(method, subscribe_key) {
//     let keys = subscriptions.get(method)
//     if( ! keys ) {
//         console.log(">>> subscriptions no method", method)
//         return
//     }
//     let subsription_map = keys.get(subscribe_key)
//     if( ! subsription_map ) {
//         console.log(">>> subscriptions no subscribe_key", subscribe_key)
//         return
//     }
//     return subsription_map
// }

