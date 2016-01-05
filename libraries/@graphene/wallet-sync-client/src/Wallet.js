
import { Map, OrderedSet } from "immutable"
import { encrypt, decrypt } from "./WalletActions"
import { PrivateKey, Signature, hash } from "@graphene/ecc" 
import WalletApi from "./WalletApi"
import assert from "assert"

/** Serilizable persisterent state (serilizable types only).. The order generally reflects the actual work-flow order. */
const inital_persistent_state = Map({
    remote_copy: undefined,
    remote_token: null,
    remote_url: null,
    email_sha1: null,
    encryption_pubkey: null,
    encrypted_wallet: null,
    local_hash: null,
    remote_created_date: null,
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
        @arg {string} [ remote_url = null ] - By passing null into this call the wallet will stop synchronizing its state with the remote server.
    */
    useBackupServer( remote_url ) {
        this.api = remote_url ? new WalletApi(remote_url) : null
        return this.sync({ remote_url })
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
        @return {Promise} resolve []
    */
    keepRemoteCopy( save = true, token = null ) {
        if( save === true ) {
            let state = this.storage.state
            if(! state.get("remote_url"))
                throw new Error("configuration_error, remote_copy without remote_url")
        }
        return this.sync({ remote_copy: save, remote_token: token })
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
                let email_sha1 = hash.sha1( email.trim().toLowerCase() )
                this.storage.setState({
                    encryption_pubkey: public_key.toString(),
                    email_sha1: email_sha1.toString('base64')
                })
            }
            // check server, decrypt and set this.wallet_object (if a wallet is found)
            var p = this.sync(undefined, private_key).then(()=> {
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
    
    
    /** This method returns an object representing the state of the wallet. It is only valid if the wallet has successfully logged in.
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
            resolve( encrypt(wallet_object, encryption_pubkey).then( encrypted_wallet => {
                return this.updateWallet(wallet_object).catch( error => {
                    console.log('ERROR setState', error, 'stack', error.stack)
                    throw error
                })
            }))
        })
    }
    
}

// /** Delete wallet, server-side only
//     @return {Promise}
//     @private
// */
// function deleteWallet() {
//     let private_key = this.private_key
//     let encrypted_wallet = this.storage.state.get("encrypted_wallet")
//     if( ! encrypted_wallet ) return Promise.resolve()
//     let local_hash = hash.sha256(encrypted_wallet)
//     let signature = Signature.signBufferSha256(local_hash, private_key)
//     return this.api.deleteWallet( local_hash, signature )
// }

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

/** Updates this.storage with newState (if succeeds)
*/
function sync(newState = Map(), private_key = this.private_key) {
    return new Promise( resolve => {

        let state = this.storage.state.merge(newState)
        
        if( ! private_key || ! this.api ) {
            this.storage.setState(state)
            resolve()
            return
        }
        
        let public_key = private_key.toPublicKey()
        let local_hash = state.get("local_hash")
        let remote_copy = state.get("remote_copy")
        
        var fetchWalletPromise = this.api.fetchWallet(public_key, local_hash)
            .then( json =>{
            
            // OK|No Content|Not Modified
            if( json.statusText === "Not Modified") {
                this.storage.setState(state)
                return
            }
            
            let local_updated_date = state.get("remote_updated_date")
            let server_has_wallet = !!json.updated
            let server_newer = server_has_wallet &&
                new Date(json.updated).getTime() > new Date(local_updated_date || 0).getTime()
            
            if( server_newer ) {
                let {updated, created, local_hash, encrypted_data} = json
                local_hash = new Buffer(local_hash, 'base64')
                if( remote_copy === false ) {
                    let signature = Signature.signBufferSha256(local_hash, private_key)
                    return api.deleteWallet( local_hash, signature ).then(()=> this.storage.setState(state))
                }
                state = state.merge({
                    local_hash,
                    encrypted_wallet: encrypted_data,
                    remote_updated_date: updated,
                    remote_created_date: created,
                })
                let backup_buffer = new Buffer(encrypted_data, 'base64')
                return decrypt(backup_buffer, private_key).then( wallet_object => {
                    this.storage.setState(state)
                    this.wallet_object = Map( wallet_object )
                })
            } else {
                if( remote_copy === false && server_has_wallet ) {
                    let signature = Signature.signBufferSha256(local_hash, private_key)
                    return api.deleteWallet( local_hash, signature ).then(()=> this.storage.setState(state))
                }
                if( this.wallet_object && remote_copy === true )
                    return this.updateWallet(this.wallet_object, state) //updateWallet updates storage
                this.storage.setState(state)
            }
        })
        resolve( fetchWalletPromise )
    })
}


/** Create or update a wallet on the server.  Updates this.storage with state (if succeeds)
*/
function updateWallet(wallet_object, state = this.storage.state) { return new Promise( resolve => {
    
    if( ! wallet_object )
        throw new Error("Missing wallet_object")
    
    if( ! this.private_key )
        throw new Error("login")
    
    let pubkey = state.get("encryption_pubkey")
    
    resolve( encrypt(wallet_object, pubkey).then( encrypted_data => {
        let local_hash_buffer = hash.sha256(encrypted_data)
        let local_hash = local_hash_buffer.toString('base64')
        if( ! state.get("remote_copy") ) {
            state = state.merge({
                local_hash,
                encrypted_wallet: encrypted_data.toString('base64'),
                remote_created_date: undefined,
                remote_updated_date: undefined
            })
            this.storage.setState(state)
            this.wallet_object = wallet_object
            return
        }
        let private_key = this.private_key
        let signature = Signature.signBufferSha256(local_hash_buffer, private_key)
        let created = state.get("remote_created_date")
        let code = state.get("remote_token")
        if( created == null ) {
            // create the server-side wallet for the first time
            let code = state.get("remote_token")
            return this.api.createWallet(code, encrypted_data, signature)
                .then( json => {
                assert.equal(json.local_hash, local_hash, 'local_hash')
                state = state.merge({
                    local_hash,
                    remote_token: null,
                    encrypted_wallet: encrypted_data.toString('base64'),
                    remote_created_date: json.remote_created_date
                })
                this.storage.setState(state)
                this.wallet_object = wallet_object
            })
        } else {
            // update the server wallet
            let original_local_hash = state.get("local_hash")
            return this.api.saveWallet(
                original_local_hash, encrypted_data, signature
                ).then( json => {
                assert.equal(json.local_hash, local_hash, 'local_hash')
                state = state.merge({
                    local_hash,
                    encrypted_wallet: encrypted_data.toString('base64'),
                    remote_updated_date: json.remote_updated_date
                })
                this.storage.setState(state)
                this.wallet_object = wallet_object
            })
        }
    }))
})}    
