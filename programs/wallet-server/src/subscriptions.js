import { Map } from "immutable"

let subscriptions = Map()

export var count = ()=> {
    let cnt = 0
    subscriptions.forEach( val => val.forEach( ()=> cnt++ ))
    return cnt
}
export function remove(ws) {
    subscriptions = subscriptions
        .filterNot(
            (subscribe_map, method)=> subscribe_map
                .filter( (subscribe_ws, subscribe_id)=>{
                    let match = subscribe_ws === ws
                    if( match ) {
                        console.error("WARN: WebSocket closed with active subscription", subscribe_id)
                    }
                    return match
                }).isEmpty()
        )
}

/**
    @return {boolean} success or false for duplicate subscription
*/
export function subscribe(ws, method, subscribe_key, subscribe_id) {
    let success = false
    subscribe_id = String(subscribe_id)
    subscriptions = subscriptions
        .updateIn([method, subscribe_key], Map(), subscribe_map =>{
            if( subscribe_map.has(subscribe_id) ) {
                return subscribe_map
            }
            success = true
            return subscribe_map.set(subscribe_id, ws)
        })
    return success
}

export function unsubscribe(method, subscribe_key, unsubscribe_id) {
    let success = false
    unsubscribe_id = String(unsubscribe_id)
    subscriptions = subscriptions
        .updateIn([method, subscribe_key], Map(), subscribe_map =>{
            if( ! subscribe_map.has(unsubscribe_id) ) {
                return subscribe_map
            }
            success = true
            return subscribe_map.remove(unsubscribe_id)
        })
    return success
}

export function getSubscriptionMap(method, subscribe_key) {
    let keys = subscriptions.get(method)
    if( ! keys ) {
        console.log(">>> subscriptions no method", method)
        return
    }
    let subsription_map = keys.get(subscribe_key)
    if( ! subsription_map ) {
        console.log(">>> subscriptions no subscribe_key", subscribe_key)
        return
    }
    return subsription_map
}

export function notify(method, subscribe_key, params) {
    let subsription_map = getSubscriptionMap(method, subscribe_key)
    if( ! subsription_map )
        return
    
    subsription_map.forEach( (ws, subscription_id) => {
        console.log(">>> subscriptions notify", subscription_id, subscribe_key, method, params)
        try {
            ws.send(JSON.stringify({
                method: "notice",
                params: [subscription_id, params]
            }))
        } catch( error ) {
            console.log("ERROR\tsubscriptions\tnotify", error, "stack", error.stack)
        }
    })
}