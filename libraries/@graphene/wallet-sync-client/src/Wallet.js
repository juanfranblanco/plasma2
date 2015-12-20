
import { Map } from "immutable"

/** Serilizable persisterent state (serilizable types only).. The order generally reflects the actual work-flow order. */
const inital_persistent_state = Map({
    remote_copy: false,
    remote_token: null,
    remote_url: null,
    email_sha1: null,
    encryption_pubkey: null,
    encrypted_wallet: null,
    local_hash_history: [],
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
        // load from disk or provide an initial state
        this.state = storage.getState() || inital_persistent_state
        // allows easy updating of state both in memory and on disk (storage remembers if it should write to disk)
        this.setState = setState.bind(this)
        // enable the backup server if one is configured (see useBackupServer)
        if(this.state.get("remote_url"))
            this.api = new WalletSyncApi(this.state.get("remote_url"))
    }
    
    /** Configure the wallet to look to a remote host to load and/or save your wallet. 
        @arg {string} [ remote_url = null ] - By passing null into this call the wallet will stop synchronizing its state with the remote server.
    */
    useBackupServer( remote_url ) {
        if( remote_url ) this.api = new WalletSyncApi(remote_url)
        this.setState({ remote_url })
    }
    
    /**
        Configure the wallet to keep a local copy on disk.  This allows the user to access the wallet even if the server is no longer available. This option can be disabled on public computers where the wallet data should never touch disk and should be deleted when the user logs out.
        
        @arg {boolean} [save = true] -  Save (or delete / do not save) all state changes to disk
    */
    keepLocalCopy( save = true ) {
        this.storage.saveToDisk( save )
    }
    
    /**
        Configure the wallet to save its data on the remote server. If this is set to false, then it will be removed from the server. If it is set to true, then it will be uploaded to the server. If the wallet is not currently saved on the server a token will be required to allow the creation of a new wallet.onfigure the wallet to save its data on the remote server. If this is set to false, then it will be removed from the server. If it is set to true, then it will be uploaded to the server. If the wallet is not currently saved on the server a token will be required to allow the creation of a new wallet.
        
        @arg {boolean} save - Enable or disable remote backups
        @arg {string} token - Code obtained via {@link WalletSyncApi.requestCode(email).  Only required for the first remote backup (from any computer). 
    */
    keepRemoteCopy( save = true, token = null ) {
        this.setState({ remote_copy: save, remote_token: token })
        
    }
    
    /**
        This API call is used to load the wallet. If a backup server has been specified then it will attempt to fetch the latest version from the server, otherwise it will load the local wallet into memory. The configuration set by keepLocalCopy will determine whether or not the wallet is saved to disk as a side effect of logging in.
        
        The wallet is unlocked in RAM when it combines these as follows: lowercase(email) + lowercase(username) + password to come up with a matching public / private key. If keepRemoteCopy is enabled, the email used to obtain the token must match the email used here. Also, if keepRemoteCopy is enabled, the server will store only a one-way hash of the email (and not the email itself) so that it can track resources by unique emails.
        
        @arg {string} email 
        @arg {string} username
        @arg {string} password
        @throws [email_required | username_required | password_required | invalid_password ]
    */
    login( email, username, password ) {
        if( ! this.private_key ) return
        if( ! email ) throw new TypeError( "email_required" )
        if( ! username ) throw new TypeError( "username_required" )
        if( ! password ) throw new TypeError( "password_required" )
        let private_key = PrivateKey.fromSeed(email.trim().toLowerCase() + username.trim().toLowerCase() + password)
        let public_key = private_key.toPublicKey()
        if( this.state.get("encryption_pubkey") ) {
            if( this.state.get("encryption_pubkey") !== public_key.toString())
                throw new TypeError( "invalid_password" )
        } else {
            this.setState({ encryption_pubkey: public_key.toString() })
        }
        this.private_key = private_key
        let encrypted_wallet = this.state.get("encrypted_wallet")
        if( encrypted_wallet ) {
            this.wallet_object = decrypt(encrypted_wallet, this.private_key)
        }
    }
    
    /** This API call will remove the wallet state from memory. */
    logout() {
        this.private_key = null
        this.wallet_object = null
    }
    
    
    /** This method returns an object representing the state of the wallet. It is only valid if the wallet has successfully logged in.
        @return {object} wallet or `null` if locked
    */
    getState() {
        return this.wallet_object
    }

    /** 
        This method is used to update the wallet state. If the wallet is configured to keep synchronized with the remote wallet then the server will refer to a copy of the wallets revision history to ensure that no version is overwritten. If the local wallet ever falls on a fork an attempt to upload that wallet will cause the API call to fail; a reconcilation will be needed. After successfully storing the state on the server, save the state to local memory, and optionally disk.
        
        @throws Error ["login"]
    */
    setState( wallet_object )  {
        if( ! this.private_key )
            throw new Error("login")
        
        let encrypted_wallet = encrypt(wallet_object, this.private_key)
        this.setState({ encrypted_wallet })
        this.wallet_object = wallet_object
    }
    
}

/** @private */
function setState(state) {
    let prev = this.state
    let next = prev.merge(state)
    
    
    this.storage.setState(newState)
    this.state = newState
}