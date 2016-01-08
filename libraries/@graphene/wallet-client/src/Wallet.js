
import { Map, OrderedSet } from "immutable"
import { encrypt, decrypt } from "./WalletActions"
import { PrivateKey, Signature, hash } from "@graphene/ecc" 
import WalletApi from "./WalletApi"
import assert from "assert"

/**
    Serilizable persisterent state (JSON serilizable types only).. The order generally reflects the actual work-flow order.
*/
const inital_persistent_state = Map({
    
    // True to stay in sync with the server (boolean)
    remote_copy: undefined,
    
    // An emailed token used to create a wallet for the 1st time (base58)
    remote_token: null,
    
    // Server's REST URL
    remote_url: null,
    
    // This is the last encrypted_wallet hash that was saved on the server (base64)
    remote_hash: null,
    
    // This is the public key derived from the email+username+password 
    encryption_pubkey: null,
    
    // Wallet JSON string encrypted using the private key derived from email+username+password (base64)
    encrypted_wallet: null,
    
    // ISO Date string from the server
    remote_created_date: null,
    
    // ISO Date string from the server
    remote_updated_date: null
})

/**
    A Wallet is a place where private user information can be stored. This information is kept encrypted when on disk or stored on the remote server.
    
    @see [Plasma Wallet API]{@link https://github.com/cryptonomex/graphene/wiki/Plasma---Wallet-API}
*/
export default class Wallet {
    
    /**
        @arg {function} storage - see {@link LocalStoragePersistence}.
    */
    constructor(storage) {
        // storage knows if it should run RAM only or persist to disk
        this.storage = storage
        this.private_key = null
        if( this.storage.state.isEmpty() ) {
            storage.setState( inital_persistent_state )
        }
        
        // enable the backup server if one is configured (see useBackupServer)
        let remote_url = this.storage.state.get("remote_url")
        if( remote_url ) this.api = new WalletApi(remote_url)
        
        // semi-private method bindings, these are used for testing
        this.sync = sync.bind(this)
        this.signHash = signHash.bind(this) // low level API requests (outside of this class)
        this.updateWallet = updateWallet.bind(this)
    }
    
    /** Configure the wallet to look to a remote host to load and/or save your wallet.
    
        Calling this method does not immediately trigger any action on the server.
        
        @arg {string} [ remote_url = null ] - By passing null into this call the wallet will stop synchronizing its state with the remote server.
        @return Promise - always resolves, added for convenience
    */
    useBackupServer( remote_url ) {
        this.api = remote_url ? new WalletApi(remote_url) : null
        this.storage.setState({ remote_url })
        return Promise.resolve()
    }
    
    /**
        Configure the wallet to keep a local copy on disk.  This allows the user to access the wallet even if the server is no longer available. This option can be disabled on public computers where the wallet data should never touch disk and should be deleted when the user logs out.
        
        By default a local copy will NOT be kept.
        
        @arg {boolean} [save = true] -  Save (or delete / do not save) all state changes to disk
    */
    keepLocalCopy( local_copy = true ) {
        this.storage.setSaveToDisk( local_copy )
    }
    
    /**
        Configure the wallet to save its data on the remote server. If this is set to false, then it will be removed from the server. If it is set to true, then it will be uploaded to the server. If the wallet is not currently saved on the server a token will be required to allow the creation of the new wallet's data on the remote server.  If this is set to false, then it will be removed from the server. If it is set to true, then it will be uploaded to the server. If the wallet is not currently saved on the server a token will be required to allow the creation of a new wallet.
        
        The default is <b>undefined</b> (neither upload nor remove).
        
        The upload or delete operation may be deferred pending: {@link this.login} and {@link this.useBackupServer}
        
        @arg {boolean} save - Add or delete remote backups or `undefined` (do neither)
        @arg {string} token - Code obtained via `wallet.api.requestCode(email)`.  Only required for the first remote backup (from any computer). 
        @throws {Error} ["remote_url required"|"login"]
        @return {Promise} - only important if the wallet is communicating with the server
    */
    keepRemoteCopy( save = true, token = this.storage.state.get("remote_token") ) {
        let state = this.storage.state
        if( save === true && ! state.get("remote_url"))
            throw new Error("configuration_error, remote_copy without remote_url")
        
        this.storage.setState({ remote_copy: save, remote_token: token })
        return this.sync()
    }
    
    /**
        This API call is used to load the wallet. If a backup server has been specified then it will attempt to fetch the latest version from the server, otherwise it will load the local wallet into memory. The configuration set by keepLocalCopy will determine whether or not the wallet is saved to disk as a side effect of logging in.
        
        The wallet is unlocked in RAM when it combines these as follows: lowercase(email) + lowercase(username) + password to come up with a matching public / private key. If keepRemoteCopy is enabled, the email used to obtain the token must match the email used here. Also, if keepRemoteCopy is enabled, the server will store only a one-way hash of the email (and not the email itself) so that it can track resources by unique emails but still respect email privacy also giving the server no advantage in guessing the email portion of the password salt.
        
        @arg {string} email 
        @arg {string} username
        @arg {string} password
        @return {Promise} - reject Error([email_required | username_required | password_required | invalid_password ]), success - getState is ready
    */
    login( email, username, password ) {
        return new Promise( resolve => {
            if( this.private_key ) {
                resolve()
                return
            }
            
            if( ! email ) throw new Error( "email_required" )
            if( ! username ) throw new Error( "username_required" )
            if( ! password ) throw new Error( "password_required" )
            
            let private_key = PrivateKey.fromSeed(
                email.trim().toLowerCase() + "\t" +
                username.trim().toLowerCase() + "\t" +
                password
            )
            
            let public_key = private_key.toPublicKey()
            
            if( this.storage.state.get("encryption_pubkey") ) {
                // check login (email, username, and password)
                if( this.storage.state.get("encryption_pubkey") !== public_key.toString())
                    throw new Error( "invalid_password" )
            } else {
                // first login
                // let email_sha1 = hash.sha1( email.trim().toLowerCase() )
                this.storage.setState({
                    encryption_pubkey: public_key.toString(),
                    // email_sha1: email_sha1.toString('base64')
                })
            }
            
            // check server, decrypt and set this.wallet_object (if a wallet is found)
            var p = this.sync(private_key).then(()=> {
                this.private_key = private_key
            })
            resolve(p)
        })
    }
    
    /** This API call will remove the wallet state from memory. */
    logout() {
        this.private_key = null
        this.wallet_object = null
    }
    
    
    /**
        This method returns the wallet_object representing the state of the wallet.  It is only valid if the wallet has successfully logged in.  If the wallet is known to be in a consistent state (after a login for example) one may instead access the object directly `this.wallet_object` instead.
    
        @return {Promise} {Immutable.Map} wallet_object or `undefined` if locked
    */
    getState() {
        if( ! this.private_key ) return Promise.resolve()
        return this.sync().then(()=> this.wallet_object )
    }

    /** 
        This method is used to update the wallet state. If the wallet is configured to keep synchronized with the remote wallet then the server will refer to a copy of the wallets revision history to ensure that no version is overwritten. If the local wallet ever falls on a fork an attempt to upload that wallet will cause the API call to fail; a reconcilation will be needed. After successfully storing the state on the server, save the state to local memory, and optionally disk.
        
        @arg {Map} wallet_object - mutable or immutable map Map({})
        @return {Promise} - reject [wallet_locked, etc...], success after state update
    */
    setState( wallet_object )  {
        return new Promise( resolve => {
            if( ! this.private_key )
                throw new Error("login")
            
            if( ! Map.isMap( wallet_object ) ) {
                if( ! typeof wallet_object === 'object')
                    throw new Error("wallet_object should an 'object' or Map")
                wallet_object = Map(wallet_object)
            }
            
            let encryption_pubkey = this.storage.state.get("encryption_pubkey")
            
            resolve(
            encrypt(wallet_object, encryption_pubkey).then( encrypted_wallet => {
                return this.updateWallet(wallet_object).catch( error => {
                    console.log('ERROR setState', error, 'stack', error.stack)
                    throw error
                })
            }))
        })
    }
    
}

/** Used to make level API requests (outside of this class)
*/
function signHash() {
    let private_key = this.private_key
    let encrypted_wallet = this.storage.state.get("encrypted_wallet")
    if( ! private_key || ! encrypted_wallet ) return
    let local_hash = hash.sha256(encrypted_wallet)
    let signature = Signature.signBufferSha256(local_hash, private_key)
    return { local_hash, signature }
}

/**
    Take the most recent server wallet and the local wallet then decide what to do: 'pull' from the server, or 'push' changes to the server ...
    @private
*/
function sync(private_key = this.private_key) {
    
    // Wallet is locked OR it is an offline wallet
    if( ! private_key || ! this.api )
        return Promise.resolve()
    
    return new Promise( resolve => {
        
        let state = this.storage.state
        let remote_hash = state.get("remote_hash")
        let remote_hash_buffer = remote_hash ? new Buffer(remote_hash, 'base64') : null
        let public_key = private_key.toPublicKey()
        let push = forcePush.bind(this)
        let pull = forcePull.bind(this)
        
        // get the most recent server wallet
        var syncPromise = this.api.fetchWallet(public_key, remote_hash_buffer)
            .then( server =>{
            
            assert(/OK|No Content|Not Modified/.test(server.statusText))
            
            let has_server_wallet = /OK|Not Modified/.test(server.statusText)
            let encrypted_wallet = state.get("encrypted_wallet")
            let has_local_wallet = encrypted_wallet != null
            
            if( ! has_server_wallet && ! has_local_wallet )
                return
            
            if( ! has_server_wallet )
                return push(has_server_wallet, private_key)
            
            if( ! has_local_wallet )
                return pull(server, private_key)
            
            // We have 2 wallets (both server and local)
            
            let current_hash = hash.sha256(new Buffer(encrypted_wallet, 'base64'))
            
            // Has local modifications since last backup
            let dirty = current_hash.toString('base64') !== remote_hash
            
            // No changes locally or remote
            if( ! dirty &&  server.statusText === "Not Modified")
                return
            
            // Push local changes (no conflict)
            if( dirty && server.statusText === "Not Modified" )
                return push(has_server_wallet, private_key)
            
            if( ! dirty && server.statusText === "OK") {
                // The server had this copy of this wallet when another device changed it (meaning that the other device must have been in sync with the wallet when the change was made).  It is safe to pull this wallet and overwrite the local version.
                return pull(server, private_key)
            }
            
            assert(dirty, 'Expecting a locally modified wallet')
            assert(server.statusText === "OK", 'Expecting a remotely modified wallet')
            
            // An internal wallet comparison is required to resolve
            throw "conflict: both server and local wallet modified"
        })
        resolve( syncPromise )
    })
}

/** syncPull.bind(this, ...) 
    @private
*/
function forcePull(server, private_key) {
    
    let state = this.storage.state
    let remote_copy = state.get("remote_copy")
    let server_local_hash = new Buffer(server.local_hash, 'base64')
    
    if( remote_copy === false ) {
        let signature = Signature.signBufferSha256(server_local_hash, private_key)
        return this.api.deleteWallet( server_local_hash, signature )
    }
    
    state = state.merge({
        remote_token: null, // unit tests will over-populate remote_token
        remote_hash: server.local_hash,
        encrypted_wallet: server.encrypted_data,
        remote_updated_date: server.updated,
        remote_created_date: server.created,
    })
    
    let backup_buffer = new Buffer(server.encrypted_data, 'base64')
    return decrypt(backup_buffer, private_key).then( wallet_object => {
        this.storage.setState(state)
        this.wallet_object = Map( wallet_object )
    })
}

/** syncPush.bind(this, ...) 
    @private
*/
function forcePush(has_server_wallet, private_key) {
    let state = this.storage.state
    let remote_copy = state.get("remote_copy")
    if( remote_copy === false && has_server_wallet ) {
        let remote_hash = state.get("remote_hash")
        if( ! remote_hash )
            throw new Error("Delete error, is this wallet in-sync?")
        
        let remote_hash_buffer = new Buffer(remote_hash, 'base64')
        let signature = Signature.signBufferSha256(remote_hash_buffer, private_key)
        return this.api.deleteWallet( remote_hash_buffer, signature )
    }
    if( this.wallet_object && remote_copy === true )
        //updateWallet updates storage
        return this.updateWallet(this.wallet_object, state)
}

/** Create or update a wallet on the server.  Updates this.storage with state (if succeeds)
*/
function updateWallet(wallet_object, state = this.storage.state) {
    return new Promise( resolve => {
    if( ! wallet_object )
        throw new Error("Missing wallet_object")
    
    if( ! this.private_key )
        throw new Error("login")
    
    let pubkey = state.get("encryption_pubkey")
    
    resolve(
        encrypt(wallet_object, pubkey).then( encrypted_data => {
        if( this.api == null ) {
            // Going offline, don't change the remote_hash. The remote_hash
            // must be the last hash sent to the server
            state = state.merge({
                encrypted_wallet: encrypted_data.toString('base64')
            })
            this.storage.setState(state)
            this.wallet_object = wallet_object
            return
        }
        let private_key = this.private_key
        let local_hash_buffer = hash.sha256(encrypted_data)
        let local_hash = local_hash_buffer.toString('base64')
        let signature = Signature.signBufferSha256(local_hash_buffer, private_key)
        let code = state.get("remote_token")
        
        if( code != null ) {
            // create the server-side wallet for the first time
            return this.api.createWallet(code, encrypted_data, signature)
                .then( json => {
                assert.equal(json.local_hash, local_hash, 'local_hash')
                state = state.merge({
                    remote_token: null,
                    remote_hash: local_hash,
                    encrypted_wallet: encrypted_data.toString('base64'),
                    remote_created_date: json.remote_created_date
                })
                this.storage.setState(state)
                this.wallet_object = wallet_object
            })
        } else {
            // update the server wallet
            let remote_hash = state.get("remote_hash")
            if( ! remote_hash )
                throw new Error("Unable to update wallet.  You probably need to provide a remote_token.")
            
            
            let remote_hash_buffer = remote_hash ? new Buffer(remote_hash, 'base64') : null
            return this.api.saveWallet(
                remote_hash_buffer, encrypted_data, signature)
                .then( json => {
                assert.equal(json.local_hash, local_hash, 'local_hash')
                state = state.merge({
                    remote_hash: local_hash,
                    encrypted_wallet: encrypted_data.toString('base64'),
                    remote_updated_date: json.remote_updated_date
                })
                this.storage.setState(state)
                this.wallet_object = wallet_object
            })
        }
    })
    )
})
}
