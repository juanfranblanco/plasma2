import assert from "assert"
import { fromJS, Map, List } from "immutable"
import { brainKey, PrivateKey } from "@graphene/ecc"
/**
    Serilizable persisterent state (JSON serilizable types only)..
*/
const empty_wallet = fromJS({
    
    //  [ LABEL: KEY ] No two keys can have the same label, no two labels can have the same key
    labeled_keys: [],
    
    // [blind_receipt,...]
    blind_receipts: []

})

const authority = fromJS({
    "weight_threshold": 1,
    "account_auths": [ /* [ "1.2.0", 0 ], [account_id, weight], ... */ ],
    "key_auths": [ /* [ "GPHXyz...public_key", 0 ], [public_key, weight], ... */ ],
    "address_auths": [ /* [ "GPHXyz...address", 0 ], [public_key, weight], ... */ ]
})

const blind_receipt = fromJS({
    
    date: null,
    
    from_key: null,
    
    from_label: null,
    
    to_key: null,
    
    to_label: null,
    
    // serializer_operations::asset
    amount: null,
    
    // String
    memo: null,
    
    // 
    authority: null,
    
    stealth_memo_data: null,
    
    used: false,
    
    // serializer_operations::stealth_confirmation
    stealth_confirmation: null
    
})

/** This class is used for stealth transfers */
export default class ConfidentialWallet {
    
    constructor(wallet) {
        req(wallet, "wallet")
        this.wallet = wallet
        this.keys = Map()
    }
    
    /**
        This method can be used to set or change the label for a public_key.

        This is a one-to-one: one key per label, one label per key.  If there is a conflict, the label is renamed. 

        @arg {string|PublicKey} - public_key string (like: GPHXyz...)
        @arg {string} - label string (like: GPHXyz...)
        @return {Promise} resolve if the label was set, otherwise reject
     */
    setKeyLabel( public_key, label ) {
        
        public_key = toString(req(public_key, "public_key"))
        req(label, 'label')
        
        let labelIndex = labeled_keys.findIndex( label_key => label_key[0] === label )
        let keyIndex = labeled_keys.findIndex( label_key => label_key[1] === public_key )
        
        if( labelIndex > -1 && keyIndex === labelIndex) {
            // already added
console.log("labelIndex,keyIndex", labelIndex,keyIndex)
            return Promise.resolve()
            
        }

        return this.wallet.setState( this.wallet.wallet_object.updateIn(["labeled_keys"], List(),
            labeled_keys =>{

                
                // rename or prefix (-1)
                let index = keyIndex === -1 ? keyIndex : labelIndex
                return labeled_keys.set(index, [ label, public_key ])
            }
        ))
        
    }
    
    /**
        @return {string} label or undefined
    */
    getKeyLabel( public_key ) {
        public_key = toString(req(public_key, "public_key"))
        let label_key = this.wallet.wallet_object.getIn(["labeled_keys"], List())
            .find( label_key => label_key[1] === public_key )
        return label_key ? label_key[0] : null
    }
    
    /**
        Generates a new blind account for the given brain key and assigns it the given label. 
        
        "Stealth accounts" are labeled private keys.  They will also be able to manage "stealth contacts" which are nothing more than labeled public keys.
        
        @throws {Error} [locked|label_exists]
        @arg {string} label
        @arg {string} brain_key
        @return {PublicKey}
    */
    createBlindAccount( label, brain_key  ) {
        
        req(label, "label")
        req(brain_key, "brain_key")
        
        if( ! this.wallet.private_key )
            throw new Error("locked")
        
        if( this.wallet.wallet_object.getIn(["labeled_keys"], Map()).get( label ) )
            throw new Error("label_exists")
        
        brain_key = brainKey.normalize( brain_key )
        let private_key = PrivateKey.fromSeed( brain_key )
        let public_key = private_key.toPublicKey()
        
        this.setKeyLabel( public_key, label )
        this.keys = this.keys.set(toString(public_key), private_key.toWif())
        
        return public_key
    }
    
    /**
        @arg {string} public key or label
        @return {Set<asset>} the total balance of all blinded commitments that can be claimed by given account key or label
    */
    getBlindBalances(pubkey_or_label) {
        // let public_key = this.get
    }
     
    /** @return {Map<label, pubkey>} all blind accounts */
    getBlindAccounts() {
    }
    
    /** @return {Map<label, pubkey>} all blind accounts for which this wallet has the private key */
    getMyBlindAccounts() {
    }
    
    /**
        @arg {string} label
        @return the public key associated with the given label
    */
    getPublicKey( label ) {
    }
    
    
    /**
        @return {List<blind_receipt>} all blind receipts to/form a particular account
    */
    blindHistory( pubkey_or_account ) {
    }
    
    /**
        Given a confirmation receipt, this method will parse it for a blinded balance and confirm that it exists in the blockchain.  If it exists then it will report the amount received and who sent it.

        @arg {string} confirmation_receipt - a base58 encoded stealth confirmation
        @arg {string} opt_from - if not empty and the sender is a unknown public key, then the unknown public key will be given the label opt_from
        @arg {string} opt_memo
        @return blind_receipt
     */
    receiveBlindTransfer( confirmation_receipt, opt_from, opt_memo ) {
    }

    /**
        Transfers a public balance from @from to one or more blinded balances using a stealth transfer.
        
        @arg {string} from_account_id_or_name
        @arg {string} asset_symbol
        @arg {Map<string, string>} to_amounts - map from key or label to amount
        @arg {boolean} [broadcast = false]
        @return {blind_confirmation}
     */
     transferToBlind( from_account_id_or_name, asset_symbol, to_amounts, broadcast = false ) {
     }

    /**
        Transfers funds from a set of blinded balances to a public account balance.
        
        @arg {string} from_blind_account_key_or_label
        @arg {string} to_account_id_or_name
        @arg {string} amount
        @arg {string} asset_symbol
        @arg {boolean} [broadcast = false]
        @return blind_confirmation
    */
    transfer_from_blind( from_blind_account_key_or_label, to_account_id_or_name, amount, asset_symbol, broadcast = false ){
   }

    /**
        Used to transfer from one set of blinded balances to another.
        
        @arg {string} from_key_or_label
        @arg {string} to_key_or_label
        @arg {string} amount
        @arg {string} asset_symbol
        @arg {boolean} [broadcast = false]
        @return blind_confirmation
    */
    blind_transfer( from_key_or_label, to_key_or_label, amount, symbol, broadcast = false ){
    }
    
}

var toString = data => data == null ? data :
    data["toString"] ? data.toString() : data // PublicKey.toString()

// required
function req(data, field_name) {
    if( data == null ) throw "Missing required field: " + field_name
    return data
}






