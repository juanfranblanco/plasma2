import bs58 from "bs58"
import express from 'express'
import limit from 'express-better-ratelimit'
import {createStore, applyMiddleware} from 'redux'
import reducer from './reducer'
import createMiddleware from './middleware'
import { WalletSyncApi } from '@graphene/wallet-sync-client'
import * as restApi from "@graphene/rest-api"
import {checkToken} from "@graphene/time-token"
import cors from "express-cors"

const {
    /** Server listen port */
    npm_package_config_rest_port,
    
    /** Limit the number of wallet requests it accepts per IP address to a fixed number per hour. */
    npm_package_config_rest_ip_requests_per_hour,
    
    /** A array of valid Access-Control-Allow-Origin value like: ['example.com'] or ["*"] */
    npm_package_config_allow_origins
    
} = process.env

const ratelimitConfig = {
    duration: 60 * 60 * 1000, // 1 hour
    max: npm_package_config_rest_ip_requests_per_hour
}

export default function createServer() {
    const createStoreWithMiddleware = applyMiddleware( createMiddleware() )(createStore)
    const store = createStoreWithMiddleware( reducer )

    var app = express()
    
    console.log("Allowed Origins", JSON.parse(npm_package_config_allow_origins))
    app.use(cors({ allowedOrigins: JSON.parse(npm_package_config_allow_origins) }))

    // Limit number of requests per hour by IP
    console.log("Limit by IP address", {
        max: ratelimitConfig.max,
        duration: ratelimitConfig.duration/1000/60+' min'
    })
    app.use(limit(ratelimitConfig))
    {
        let debugApi = {
            checkToken: function({ code }) {
                token = bs58.decode(token)
                token = new Buffer(token).toString('binary')
                return {type: 'checkToken', result: checkToken(token)}
            }
        }
        let debugDispatch = action => {
            switch(action.type) {
            case 'checkToken':
                if(action.result.valid === true) action.rest_api.ok()
                else action.rest_api.response("Unauthorized", {result: action.result.error})
                break
            }
        }
        app.get("/debug/:methodName", restApi.get(debugApi, debugDispatch))
    }
    app.get("/:methodName", restApi.get(WalletSyncApi, store.dispatch))
    app.post("/:methodName", restApi.post(WalletSyncApi, store.dispatch))
    let server = app.listen(npm_package_config_rest_port)
    server.on('listening', ()=>{ console.log('Server listening port %d', npm_package_config_rest_port) })
    server.on('close', ()=>{ console.log('Server closed port %d', npm_package_config_rest_port) })
    server.on('error', error =>{ console.error(error) })
    return { server, app }
}