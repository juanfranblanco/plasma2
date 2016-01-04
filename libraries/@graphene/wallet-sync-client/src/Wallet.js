
import { Map } from "immutable"
import { encrypt, decrypt } from "./WalletActions"
import { PrivateKey, Signature, hash } from "@graphene/ecc" 
import WalletApi from "./WalletApi"

const remote_url = process.env.npm_package_config_remote_url

/** Serilizable persisterent state (serilizable types only).. The order generally reflects the actual work-flow order. */
const inital_persistent_state = Map({
    remote_copy: false,
    remote_token: null,
    remote_url: remote_url,
    email_sha1: null,
    encryption_pubkey: null,
    encrypted_wallet: null,
    local_hash_history: [],
    remote_created_date: null,
    remote_updated_date: null
})

/** @private */
function putWallet(wallet_object) { return new Promise( resolve => {
    
    if( ! wallet_object )
        throw new Error("Missing wallet_object")
    
    if( ! this.private_key )
        throw new Error("wallet_locked")
    
    let code = this.storage.state.get("remote_token")
    var pubkey = this.storage.state.get("encryption_pubkey")
    
    resolve( encrypt(wallet_object, pubkey).then( encrypted_data => {
        // this.storage.private_key
        let local_hash_buffer = hash.sha256(encrypted_data)
        let private_key = this.private_key
        let signature = Signature.signBufferSha256(local_hash_buffer, private_key)
        let local_hash = local_hash_buffer.toString('base64')
        let created = this.storage.state.get("remote_created_date")
        let code = this.storage.state.get("remote_token")
        if( created == null ) {
            let code = this.storage.state.get("remote_token")
            return this.api.createWallet(code, encrypted_data, signature)
                .then( json => {
                assert.equal(json.local_hash, local_hash, 'local_hash')
                this.storage.setState({ local_hash, created: json.remote_created_date })
            })
        } else {
            let original_local_hash = this.storage.state.get("local_hash") 
            return this.api.saveWallet(original_local_hash, encrypted_data, signature)
                .then( json => {
                assert.equal(json.local_hash, local_hash, 'local_hash')
                this.storage.setState({ local_hash, updated: json.remote_updated_date })
            })
        }
    }))
})}    


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
        this.putWallet = putWallet.bind(this)
        // enable the backup server if one is configured (see useBackupServer)
        this.api = new WalletApi(this.storage.state.get("remote_url"))
        
        this.syncCheck = syncCheck.bind(this)
        this.syncCheck()
    }
    
    /** Configure the wallet to look to a remote host to load and/or save your wallet. 
        @arg {string} [ remote_url = null ] - By passing null into this call the wallet will stop synchronizing its state with the remote server.
    */
    useBackupServer( remote_url ) {
        this.api = remote_url ? new WalletApi(remote_url) : null
        this.storage.setState({ remote_url })
        this.syncCheck()
    }
    
    /**
        Configure the wallet to keep a local copy on disk.  This allows the user to access the wallet even if the server is no longer available. This option can be disabled on public computers where the wallet data should never touch disk and should be deleted when the user logs out.
        
        @arg {boolean} [save = true] -  Save (or delete / do not save) all state changes to disk
    */
    keepLocalCopy( local_copy = true ) {
        this.storage.setSaveToDisk( local_copy )
    }
    
    /**
        Configure the wallet to save its data on the remote server. If this is set to false, then it will be removed from the server. If it is set to true, then it will be uploaded to the server. If the wallet is not currently saved on the server a token will be required to allow the creation of a new wallet.onfigure the wallet to save its data on the remote server. If this is set to false, then it will be removed from the server. If it is set to true, then it will be uploaded to the server. If the wallet is not currently saved on the server a token will be required to allow the creation of a new wallet.
        
        @arg {boolean} save - Enable or disable remote backups
        @arg {string} token - Code obtained via {@link WalletApi.requestCode(email).  Only required for the first remote backup (from any computer). 
    */
    keepRemoteCopy( save = true, token = null ) {
        this.storage.setState({ remote_copy: save, remote_token: token })
        this.syncCheck()
    }
    
    /**
        This API call is used to load the wallet. If a backup server has been specified then it will attempt to fetch the latest version from the server, otherwise it will load the local wallet into memory. The configuration set by keepLocalCopy will determine whether or not the wallet is saved to disk as a side effect of logging in.
        
        The wallet is unlocked in RAM when it combines these as follows: lowercase(email) + lowercase(username) + password to come up with a matching public / private key. If keepRemoteCopy is enabled, the email used to obtain the token must match the email used here. Also, if keepRemoteCopy is enabled, the server will store only a one-way hash of the email (and not the email itself) so that it can track resources by unique emails but still respect email privacy also giving the server no advantage in guessing the email portion of the password salt.
        
        @arg {string} email 
        @arg {string} username
        @arg {string} password
        @return {Promise} - reject [email_required | username_required | password_required | invalid_password ], success - getState is ready
    */
    login( email, username, password ) {
        return new Promise( resolve => {
            if( this.private_key ) return
            if( ! email ) throw new TypeError( "email_required" )
            if( ! username ) throw new TypeError( "username_required" )
            if( ! password ) throw new TypeError( "password_required" )
            let private_key = PrivateKey.fromSeed(
                email.trim().toLowerCase() + username.trim().toLowerCase() + password)
            let public_key = private_key.toPublicKey()
            if( this.storage.state.get("encryption_pubkey") ) {
                if( this.storage.state.get("encryption_pubkey") !== public_key.toString())
                    throw new TypeError( "invalid_password" )
            } else {
                this.storage.setState({ encryption_pubkey: public_key.toString() })
            }
            this.private_key = private_key
            let encrypted_wallet = this.storage.state.get("encrypted_wallet")
            if( ! encrypted_wallet ) {
                resolve()
                return
            }
            resolve(this.syncCheck.then(()=> {
                let backup_buffer = new Buffer(encrypted_wallet, 'binary')
                decrypt(backup_buffer, this.private_key).then( wallet_object => {
                    this.wallet_object = Map( wallet_object )
                })
            }))
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
        return this.syncCheck().then( ()=> this.wallet_object )
    }

    /** 
        This method is used to update the wallet state. If the wallet is configured to keep synchronized with the remote wallet then the server will refer to a copy of the wallets revision history to ensure that no version is overwritten. If the local wallet ever falls on a fork an attempt to upload that wallet will cause the API call to fail; a reconcilation will be needed. After successfully storing the state on the server, save the state to local memory, and optionally disk.
        
        @arg {Map} wallet_object - mutable or immutable map Map({})
        @return {Promise} - reject [wallet_locked, etc...], success after state update
    */
    setState( wallet_object )  {
        return new Promise( resolve => {
            if( ! this.private_key )
                throw new Error("wallet_locked")
            
            if( ! Map.isMap( wallet_object ) ) {
                if( ! typeof wallet_object === 'object')
                    throw new Error("wallet_object should an 'object' or Map")
                wallet_object = Map(wallet_object)
            }
            let encryption_pubkey = this.storage.state.get("encryption_pubkey")
            resolve( encrypt(wallet_object, encryption_pubkey).then( encrypted_wallet => {
                let p = this.putWallet(wallet_object).then(()=>{
                    this.storage.setState({ encrypted_wallet: encrypted_wallet.toString('binary') })
                    this.wallet_object = wallet_object
                }).catch( error => {
                    if(error.cause.message === "Validation error") {
                        // this wallet exists
                        console.log("errora", error)
                    }
                })
                
                return p
            }))
        })
    }
    
    /** @return {Promise} */
    delete() {
        let private_key = this.private_key
        let encrypted_wallet = this.storage.state.get("encrypted_wallet")
        if( ! encrypted_wallet ) return Promise.resolve()
        let local_hash = hash.sha256(encrypted_wallet)
        let signature = Signature.signBufferSha256(local_hash, private_key)
        return this.api.deleteWallet( local_hash, signature )
    }
    
}

/** @private */
function syncCheck() {
    let {
        remote_copy, remote_token, remote_url,
        email_sha1, encryption_pubkey, encrypted_wallet,
        local_hash_history, remote_created_date, remote_updated_date
    } = this.storage.state.toJS()
    
    return Promise.resolve()
}

