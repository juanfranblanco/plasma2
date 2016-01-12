var Immutable = require("immutable")

const SOCKET_DEBUG = process.env.npm_config__graphene_wallet_client_socket_debug

export default class WebSocketRpc {

    /**
        @arg {string} ws_server_url - WebSocket URL
        @arg {function} update_rpc_connection_status_callback called with ("open"|"error"|"closed").
    */
    constructor(ws_server_url, update_rpc_connection_status_callback) {
        this.update_rpc_connection_status_callback = update_rpc_connection_status_callback;
        var WebSocketClient = typeof(WebSocket) !== "undefined" ? require("ReconnectingWebSocket") : require("websocket").w3cwebsocket;
        this.web_socket = new WebSocketClient(ws_server_url);
        this.current_reject = null;
        this.on_reconnect = null;
        this.connect_promise = new Promise((resolve, reject) => {
            this.current_reject = reject;
            this.web_socket.onopen = () => {
                if(this.update_rpc_connection_status_callback)
                    this.update_rpc_connection_status_callback("open");
                
                if(this.on_reconnect) this.on_reconnect();
                resolve();
            }
            // Warning, onerror callback is over-written on each request.  Be cautious to dulicate some logic here.
            this.web_socket.onerror = (error) => {
                console.error("ERROR\tweb_socket", error)
                if(this.update_rpc_connection_status_callback)
                    this.update_rpc_connection_status_callback("error");
                
                if (this.current_reject) {
                    this.current_reject(error);
                }
            };
            this.web_socket.onmessage = (message) => this.listener(JSON.parse(message.data));
            this.web_socket.onclose = () => {
                if(this.update_rpc_connection_status_callback)
                    this.update_rpc_connection_status_callback("closed");
            };
        });
        this.current_callback_id = 0;
        this.callbacks = {};
        this.subscriptions = {};
        this.unsub = {};
    }
    
    /**
        @arg {string} method - API method name
        @arg {object} params - JSON serilizable parameters
        @return {Promise}
    */
    call(method, params) {
        return this.request( ++ this.current_callback_id, method, params)
    }
    
    /**
        Invoke a method and subscribe to multiple replies..  The server must support this feature; the server-side subscribe call will see the parameters here wrapped in a array that includes a client-side subscription ID (like this: [1, params] ).  This ID is internal and is  to map a notifications from the server back to the callback function.
        
        @arg {string} method - API method name (server will provide a subscribe_xxx method)
        @arg {object} params - JSON serilizable parameters
        @arg {function} callback - called by the server to send you a notification
        @arg {object} [subscribe_key = { method, params }] - client-side unique key for each subscription
        @return {Promise}
    */
    subscribe(method, params, callback, subscribe_key = { method, params }) {
        
        this.current_callback_id ++
        
        this.subscriptions[this.current_callback_id] = {
            callback,
            method, params: Immutable.fromJS(params),
            key: Immutable.fromJS(subscribe_key)
        }
        
        // Wrap parameters, send the subscription callback ID to the server
        params = { subscribe_id: this.current_callback_id, subscribe_key, params }
        return this.request(this.current_callback_id, method, params)
    }
    
    /**
        Remove your subscription.  Provide the same unique key from {@link this.subscribe}.
        
        @arg {string} method - API method name (server will provide a unsubscribe_xxx method)
        @arg {object} params - JSON serilizable parameters
        @arg {object} [subscribe_key = { method, params }] - client-side unique key for each subscription
        @return {Promise}
    */
    unsubscribe(method, params, subscribe_key = { method, params }) {
        
        this.current_callback_id ++
        let unSubParams = Immutable.fromJS(subscribe_key);
        let subscription_id
        
        for (let id in this.subscriptions) {
            let s = this.subscriptions[id]
            if (Immutable.is(s.key, unSubParams)) {
                this.unsub[this.current_callback_id] = id
                subscription_id = id
                break
            }
        }
        
        if( ! subscription_id ) {
            let msg = ("WARN: unsubscribe did not find subscribe_key",
                "subscribe_key", subscribe_key, " for method", method).join(' ')
            console.error(msg)
            return Promise.reject(msg)
        }
        
        // Wrap parameters, send the subscription ID to the server
        params = { unsubscribe_id: subscription_id, subscribe_key, params }
        return this.request(this.current_callback_id, method, params)
    }
    
    close() {
        if( Object.keys(this.subscriptions).length !== 0 )
            console.error("WARN: close called with active subscriptions",
                Object.keys(this.subscriptions).length)
        
        this.web_socket.close()
    }
    
    /**
        Transmit's JSON.stringify(request) to the server
        @arg {number} id = current_callback_id, see this.callbacks
        @private
    */
    request(id, method, params) {
        if(SOCKET_DEBUG)
            console.log("[WebSocketRpc] ----- call ---- >", id, method, params);
        
        return this.connect_promise.then(()=> {
            return new Promise( (resolve, reject) => {
                let time = new Date()
                this.callbacks[id] = { time, resolve, reject }
                
                this.web_socket.onerror = (error) => {
                    
                    if(this.update_rpc_connection_status_callback)
                        this.update_rpc_connection_status_callback("error")
                    
                    console.log("!!! WebSocket Error ", error);
                    reject(error);
                };
                
                this.web_socket.send(JSON.stringify({ id, method, params }));
            })
        })
    }
    
    /** @private */
    listener(response) {
        if(SOCKET_DEBUG)
            console.log("[WebSocketRpc] <--- reply ---- <", response.id, response);
        
        let sub = false,
            callback = null;

        if (response.method === "notice") {
            sub = true;
            response.id = response.params[0];
        }

        if ( sub ) {
            callback = this.subscriptions[response.id].callback;
        } else {
            callback = this.callbacks[response.id];
        }

        if (callback && sub) {
            
            callback(response.params[1]);
        
        } else if (callback && ! sub) {
            
            if (response.error) {
                callback.reject(response.error);
            } else {
                callback.resolve(response.result);
            }
            delete this.callbacks[response.id];

            if (this.unsub[response.id]) {
                delete this.subscriptions[this.unsub[response.id]];
                delete this.unsub[response.id];
            }
            
        } else {
            console.log("Warning: unknown websocket response: ", response);
        }
    }

}