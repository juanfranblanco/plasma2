var ChainWebSocket = require("./ChainWebSocket");
var GrapheneApi = require("./GrapheneApi");
var chain_config = require("./config")

var Apis, apis_instance;

/**
    Configure: configure as follows `Apis.instance("ws://localhost:8090").init_promise`.  This returns a promise, once resolved the connection is ready.
    
    Import: import { Apis } from "@graphene/chain"
    
    Short-hand: Apis.db("method", "parm1", 2, 3, ...).  Returns a promise with results.
    
    Additional usage: Apis.instance().db_api().exec("method", ["method", "parm1", 2, 3, ...]).  Returns a promise with results.
*/
export default Apis = {
    
    setRpcConnectionStatusCallback: function(callback) {
        this.update_rpc_connection_status_callback = callback;
        if(apis_instance) apis_instance.setRpcConnectionStatusCallback(callback);
    },
    
    /**
        @arg {string} connection_string is only provided in the first call
        @return {Apis} singleton .. Check Apis.instance().init_promise to know when the connection is established
    */
    instance: function ( connection_string = "ws://localhost:8090" ) {
        if ( ! apis_instance ) {
            apis_instance = new ApisInstance();
            apis_instance.setRpcConnectionStatusCallback(this.update_rpc_connection_status_callback);
            apis_instance.connect( connection_string );
        }
        return apis_instance;
    },
    chainId: ()=> Apis.instance().chain_id,
    db: (method, ...args) => Apis.instance().db_api().exec(method, args),
    network: (method, ...args) => Apis.instance().network_api().exec(method, args),
    history: (method, ...args) => Apis.instance().history_api().exec(method, args),
    crypto: (method, ...args) => Apis.instance().crypto_api().exec(method, args)
};

class ApisInstance {

    /** @arg {string} connection .. */
    connect( connection_string ) {
        
        // Graphene-ui code, move this to the app's init routine:
        
        // if (this.ws_rpc) return; // already connected
        // let rpc_user, rpc_password;
        // try { // For command-line support, all references to "window" go in the try catch
        //     let rpc_host, rpc_port;
        //     let args = window.location.hash.split("/");
        //     if (args.length > 2) {
        //         let parts = args[2].split(":");
        //         rpc_user = parts[0];
        //         rpc_password = parts[1];
        //         rpc_host = parts[2];
        //         rpc_port = parts[3];
        //     }
        //     if (rpc_host) {
        //         let protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
        //         let port = rpc_port ? `:${rpc_port}` : "";
        //         connection_string = `${protocol}${rpc_host}${port}`
        //     }
        // } catch (e) {}
        // if (!connection_string) connection_string = SettingsStore.getSetting("connection");
        //connection_string = "ws://localhost:8090";
        
        console.log("INFO\tApiInstances\tconnect\t", connection_string);
        
        let rpc_user = "", rpc_password = ""
        
        this.ws_rpc = new ChainWebSocket(connection_string, this.update_rpc_connection_status_callback);
        this.init_promise = this.ws_rpc.login(rpc_user, rpc_password).then(() => {
            this._db_api = new GrapheneApi(this.ws_rpc, "database");
            try { window.$db_api = this._db_api; } catch(e) { /* nodejs */ }
            this._network_api = new GrapheneApi(this.ws_rpc, "network_broadcast");
            this._history_api = new GrapheneApi(this.ws_rpc, "history");
            this._crypto_api = new GrapheneApi(this.ws_rpc, "crypto");
            var db_promise = this._db_api.init().then( ()=> {
                //https://github.com/cryptonomex/graphene/wiki/chain-locked-tx
                return this._db_api.exec("get_chain_id",[]).then( _chain_id => {
                    this.chain_id = _chain_id
                    chain_config.setChainId( _chain_id )
                    //DEBUG console.log("chain_id1",this.chain_id)
                });
            });
            this.ws_rpc.on_reconnect = () => {
                this.ws_rpc.login("", "").then(() => {
                    this._db_api.init().then(() => {
                        if(this.update_rpc_connection_status_callback)
                            this.update_rpc_connection_status_callback("reconnect");
                    });
                    this._network_api.init();
                    this._history_api.init();
                    this._crypto_api.init();
                });
            }
            return Promise.all([db_promise,
                this._network_api.init(),
                this._history_api.init(),
                this._crypto_api.init()]);
        });
    }
    
    close() {
        this.ws_rpc.close();
        this.ws_rpc = null
    }
    
    db_api () {
        return this._db_api;
    }
    
    network_api () {
        return this._network_api;
    }
    
    history_api () {
        return this._history_api;
    }
    
    crypto_api () {
        return this._crypto_api;
    }

    setRpcConnectionStatusCallback(callback) {
        this.update_rpc_connection_status_callback = callback;
    }
    
}


