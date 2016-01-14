
import express from 'express'
import limit from 'express-better-ratelimit'
import {createStore, applyMiddleware} from 'redux'
import reducer from './reducer'
import createMiddleware from './middleware'
import * as actions from './actions'
import { wsResponse, wsReplySugar } from "./ws-api"
import {checkToken} from "@graphene/time-token"
import { Set, Map } from "immutable"
import * as subscriptions from "./subscriptions"

const {
    /** Server listen port */
    npm_package_config_rest_port,
    
    /** Limit the number of wallet requests it accepts per IP address to a fixed number per hour. */
    npm_package_config_rest_ip_requests_per_hour,
    
} = process.env

const ratelimitConfig = {
    duration: 60 * 60 * 1000, // 1 hour
    max: npm_package_config_rest_ip_requests_per_hour
}

let sockets = Set()
let WebSocketServer = require("ws").Server

export default function createServer() {
    const createStoreWithMiddleware = applyMiddleware( createMiddleware() )(createStore)
    const store = createStoreWithMiddleware( reducer )

    // var app = express()
    // var expressWs = require('express-ws')(app)
    let wss = new WebSocketServer({port: npm_package_config_rest_port})
    wss.on('listening', ()=>{ console.log('Server listening port %d', npm_package_config_rest_port) })
    wss.on('close', ()=>{ console.log('Server closed port %d', npm_package_config_rest_port) })
    wss.on('error', error =>{
        console.error('ERROR\tserver\tonerror\t', error, 'stack', error.stack)
        // console.error('ERROR\tserver\tonerror\trestart')
        // createServer()
    })
     
    // app.use((req, res, next) => {
    //     let origin = req.get('Origin')
    //     res.set('Access-Control-Allow-Origin', origin)
    //     res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    //     res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type')
    //     res.set('Access-Control-Allow-Credentials', 'true')
    //     next()
    // })

    // Limit number of requests per hour by IP
    // console.log("Limit by IP address", {
    //     max: ratelimitConfig.max,
    //     duration: ratelimitConfig.duration/1000/60+' min'
    // })
    // app.use(limit(ratelimitConfig))
    
    // app.get('/wallet_v1', function(req, res, next){
    //     console.log('GET Not Supported', "IP", ipAddress(ws));
    //     wsResponse(res, 0, "Not Supported")
    //     res.end()
    // })
    
    wss.on("connection", ws => { try {
    // app.ws("/wallet_v1", (ws, req) => { try {
    
        sockets = sockets.add(ws)
        console.log('>>>> NEW SOCKET', "Total sockets", sockets.count())
        
        ws.on('close', ()=> {
            sockets = sockets.remove(ws)
            subscriptions.remove(ws)
            console.log(">>>> CLOSE", "remaining sockets", sockets.count(),
                "remaining subscriptions", subscriptions.count())
        })
        
        ws.on('message', msg => {
            
            let id = 0
            let wsType = ws // standared non-subscription reply
            
            if( ws.upgradeReq.url !== "/wallet_v1") {
                wsResponse(wsType, id, "Bad Request", { error: "Unknown URL" })
                return
            }
            
            try {
                let payload = JSON.parse(msg)

                id = payload.id
                let { method, params } = payload
                let { subscribe_id, unsubscribe_id, subscribe_key } = params
                
                if( subscribe_id != null || unsubscribe_id != null) {
                    if( ! subscribe_key ) {
                        wsResponse(wsType, id, "Bad Request", { error: "Missing subscribe_key" })
                        return
                    }
                    
                    // un-wrap parameters
                    params = params.params
                    
                    if( subscribe_id != null ) {
                        
                        if( subscriptions.subscribe(ws, method, subscribe_key, subscribe_id)) {
                            
                            // Send the OK that the subscription was successful
                            wsResponse(wsType, id, "OK")
                            
                            // Setup subscription reply (this format is detected in ws-api)
                            wsType = { websocket: ws, subscription_id: subscribe_id }
                            
                            // Do NOT return, allow the subscription call to execute below
                        } else {
                            wsResponse(wsType, id, "Bad Request", { error: "Already subscribed" })
                            return
                        }
                        
                    } else if( unsubscribe_id != null ) {
                        if( subscriptions.unsubscribe(ws, method, subscribe_key, unsubscribe_id)) {
                            wsResponse(wsType, id, "OK")
                        } else {
                            wsResponse(wsType, id, "Bad Request", { error: "Unknown unsubscription" })
                        }
                        return
                    }
                }
                
                let methodFunction = actions[method]
                if( ! methodFunction ) {
                    if( debug ) console.error("ERROR\tunknown method", method)
                    wsResponse(wsType, id, "Bad Request", { error: "Unknown method" })
                    return
                }
                let action = methodFunction( params )
                console.log("Message", method, action)
                if( ! action || ! store.dispatch ) {
                    wsResponse( wsType, id, "OK" )
                    return
                }
                //  Allow the reducer to reply with a message
                wsReplySugar( wsType, id, action ) // Add a reply function to "action"
                store.dispatch( action )
            } catch( error ) { try {
                console.error("ERROR\tserver\t", error, 'stack', error.stack)
                wsResponse(wsType, id, "Bad Request", typeof error === "string" ? {error} : undefined)
            } catch( error ) {
                console.error("ERROR\tserver\t", error, 'stack', error.stack)
            }} 
        })
    } catch(error) { console.error("ERROR\tserver\t", error, 'stack', error.stack) } })
    
    return { server: wss }
}


// x-forwarded-for, behind an Nginx reverse proxy
let ipAddress = ws => {
    try {
        return (ws.upgradeReq && (ws.upgradeReq.headers['x-forwarded-for']) ||
            ws.upgradeReq.connection.remoteAddress)
    }catch(e) {
        return
    }
}
