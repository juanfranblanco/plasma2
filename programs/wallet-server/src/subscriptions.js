import { Map } from "immutable"

let subscriptions = Map()

export var count = ()=> subscriptions.count()

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

export function subscribe(ws, method, subscribe_key, subscribe_id, dup) {
    subscriptions = subscriptions
        .updateIn([method, subscribe_key], Map(), subscribe_map =>{
            if( subscribe_map.has(subscribe_id) ) {
                dup()
                return subscribe_map
            }
            return subscribe_map.set(subscribe_id, ws)
        })
}

export function unsubscribe(method, subscribe_key, unsubscribe_id, unknown) {
    subscriptions = subscriptions
        .updateIn([method, subscribe_key], Map(), subscribe_map =>{
            if( ! subscribe_map.has(unsubscribe_id) ) {
                unknown()
                return subscribe_map
            }
            return subscribe_map.remove(unsubscribe_id)
        })
}

export function notify(subscribe_key, method, params) {
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
    subsription_map.forEach( (ws, subscription_id) => {
        console.log(">>> subscriptions notify", subscription_id, subscribe_key, method, params)
        ws.send(JSON.stringify({
            method: "notice",
            params: [subscription_id, params]
        }))
    })
}