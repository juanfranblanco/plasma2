
import express from 'express'
import limit from 'express-better-ratelimit'
import {createStore, applyMiddleware} from 'redux'
import reducer from './reducer'
import createMiddleware from './middleware'
import * as actions from './actions'
import { wsResponse, wsReplySugar } from "./ws-api"
import {checkToken} from "@graphene/time-token"

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

export default function createServer() {
    const createStoreWithMiddleware = applyMiddleware( createMiddleware() )(createStore)
    const store = createStoreWithMiddleware( reducer )

    var app = express()
    var expressWs = require('express-ws')(app)
    
    // app.use((req, res, next) => {
    //     let origin = req.get('Origin')
    //     res.set('Access-Control-Allow-Origin', origin)
    //     res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    //     res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type')
    //     res.set('Access-Control-Allow-Credentials', 'true')
    //     next()
    // })

    // Limit number of requests per hour by IP
    console.log("Limit by IP address", {
        max: ratelimitConfig.max,
        duration: ratelimitConfig.duration/1000/60+' min'
    })
    app.use(limit(ratelimitConfig))
    // app.get('/wallet_v1', function(req, res, next){
    //     // console.log('GET Not Supported');
    //     wsResponse(res, id, "Not Supported")
    //     res.end()
    // })
    
    app.ws("/wallet_v1", (ws, req) => {
        console.log('New socket')
        ws.on('open', function open() {
            console.log("open")
        })
        ws.on('message', msg => {
            let id = 0
            try {
                let payload = JSON.parse(msg)

                id = payload.id
                let { method, params } = payload
                let { subscribe_id, unsubscribe_id } = params
                // console.log("subscription", subscribe_id, unsubscribe_id )
                
                // un-wrap parameters
                if( subscribe_id != null || unsubscribe_id != null)
                    params = params.params
                
                let methodFunction = actions[method]
                if( ! methodFunction ) {
                    if( debug ) console.error("ERROR\tunknown method", method)
                    wsResponse(ws, id, "Bad Request", { error: "Unknown method" })
                    return
                }
                let action = methodFunction( params )
                console.log("Message", method, action)
                if( ! action || ! store.dispatch ) {
                    wsResponse( ws, id, "OK" )
                    return
                }
                //  Allow the reducer to reply with a message
                wsReplySugar( ws, id, action ) // Add a reply function to "action"
                store.dispatch( action )
            } catch( error ) { try {
                console.error("ERROR\tserver\t", error, 'stack', error.stack)
                wsResponse(ws, id, "Bad Request", typeof error === "string" ? {error} : undefined)
            } catch( error ) {
                console.error("ERROR\tserver\t", error, 'stack', error.stack)
            }} 
        })
    })
    
    let server = app.listen(npm_package_config_rest_port)
    server.on('listening', ()=>{ console.log('Server listening port %d', npm_package_config_rest_port) })
    server.on('close', ()=>{ console.log('Server closed port %d', npm_package_config_rest_port) })
    server.on('error', error =>{
        console.error('wallet-server::createServer\t', error, error.stack)
        console.error('wallet-server::createServer\trestart')
        createServer()
    })
    return { server, app }
}


