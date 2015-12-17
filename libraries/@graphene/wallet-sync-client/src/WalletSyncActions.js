

/** Combines local storage and remote APIs to offer high-level functionality.  Unless documented otherwise, functions in this class return a promise.
*/
export default class WalletSyncActions {
    
    constructor(api, storage) {
        this.api = api
        this.storage = storage
    }
    
    emailCode(email) {
        return this.api.requestCode(email)
            .then( json => this.storage.setEmail(email, json.expire_min) )
    }
    
    /** Saves or create the wallet on the remote wallet service.  You do not need to unlock to encrypt and save a wallet object.
        @arg {object} wallet_object
        @throws InternalError("Call validateEmail first") | InternalError("Wallet locked")
    */
    saveWallet(wallet_object) {
        if( typeof wallet_object !== 'object' ) throw new TypeError("wallet_object")
        if( ! this.state.get("email_validated") ) throw new InternalError("Call validateEmail first")
        
    }
    
    /** 
        @arg {object} wallet_object
        @returns 
        @throws InternalError("Call validateEmail first") | InternalError("Wallet locked")
    */
    createEncryptedBackup(wallet_object) {
        if( typeof wallet_object !== 'object' ) throw new TypeError("wallet_object")
        if( ! this.state.get("email_validated") ) throw new InternalError("Call validateEmail first")
        
    }
    
    
    
}