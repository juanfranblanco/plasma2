import assert from "assert"
import { fromJS, Map, List } from "immutable"
import { brainKey, PrivateKey, PublicKey } from "@graphene/ecc"
import { fetchChain, config } from "@graphene/chain"

// /**
//     This is for documentation purposes..
//     Serilizable persisterent state (JSON serilizable types only)..  
// */
// const empty_wallet = fromJS({
//     
//     public_name: t.Str,
//     created: t.Dat,
//     last_modified: t.Dat,
//     backup_date: t.maybe(t.Dat),
//     brainkey: t.maybe(t.Str),
//     brainkey_sequence: t.Num,
//     brainkey_backup_date: t.maybe(t.Dat),
//     deposit_keys: t.maybe(t.Obj),
//     chain_id: t.Str,
//     
//     // [blind_receipt,...]
//     blind_receipts: [],
//     
//     keys:
//         "pubkey": {
//             //  No two keys can have the same label, no two labels can have the same key
//             label: t.maybe(t.Str),
//             import_account_names: t.maybe(t.Arr),
//             brainkey_sequence: t.maybe(t.Num),
//             private_wif: t.Str // was: encrypted_key: t.Str
//         }
//         
// })

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
    
    constructor( walletStorage ) {
        
        this.wallet = req(walletStorage, "walletStorage")
        
        // semi-private methods (outside of this API)
        this.update = update.bind(this)// update the wallet object
        this.assertLogin = assertLogin.bind(this)
    }
    
    /**
        This method can be used to set or change the label for a public_key.

        This is a one-to-one: one key per label, one label per key.  If there is a conflict, the label is renamed. 

        @arg {string|PublicKey} - public_key string (like: GPHXyz...)
        @arg {string} - label string (like: GPHXyz...)
        @return {boolean} false if this label is already assigned
     */
    setKeyLabel( public_key, label ) {
        
        this.assertLogin()
        public_key = toString(req(public_key, "public_key"))
        req(label, 'label')
        
        let keys = this.wallet.wallet_object.getIn(["keys"], Map())
        let key = keys.find( key => key.get("label") === label )
        if( key != null )
            // this label is already assigned
            return false

        this.update(wallet =>
            wallet.updateIn(["keys", public_key], Map(),
                key => key.set("label", label))
        )
        return true
    }
    
    /**
        @return {string} label or null
    */
    getKeyLabel( public_key ) {
        
        this.assertLogin()
        public_key = toString(req(public_key, "public_key"))
        
        let key = this.wallet.wallet_object.getIn(["keys", public_key])
        return key ? key.get("label") : null
    }
    
    /**
        @arg {string} label
        @return {PublicKey} or null
    */
    getPublicKey( label ) {
        
        this.assertLogin()
        req(label, "label")
        
        let keys = this.wallet.wallet_object.getIn(["keys"], Map())
        let pubkey = keys.findKey( key => key.get("label") === label )
        if( ! pubkey)
            return null
        
        return PublicKey.fromStringOrThrow( pubkey )
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

        this.assertLogin()
        req(label, "label")
        req(brain_key, "brain_key")
        
        brain_key = brainKey.normalize( brain_key )
        let private_key = PrivateKey.fromSeed( brain_key )
        let public_key = private_key.toPublicKey()
        
        if( ! this.setKeyLabel( public_key, label ))
            throw new Error("label_exists")
        
        this.update(wallet =>
            wallet.updateIn(["keys", toString(public_key)], Map(),
                key => key.set("private_wif", private_key.toWif))
        )
        
        return public_key
    }
    
    /** @return {Map<label, pubkey>} all blind accounts */
    getBlindAccounts() {
        this.assertLogin()
        let keys = this.wallet.wallet_object.getIn(["keys"], Map())
        return keys.reduce( (r, key, pubkey) => r.set(key.get("label"), pubkey), Map())
    }
    
    /** @return {Map<label, pubkey>} all blind accounts for which this wallet has the private key */
    getMyBlindAccounts() {
        this.assertLogin()
        let keys = this.wallet.wallet_object.getIn(["keys"], Map())
        let reduce = (r, label, pubkey) => ! keys.has(pubkey) ? r : r.set(label, pubkey)
        return keys.reduce( (r, key, pubkey) => reduce(r, key.get("label"), pubkey), Map())
    }
    
    /**
        @arg {string} public key or label
        @return {Set<asset>} the total balance of all blinded commitments that can be claimed by given account key or label
    */
    getBlindBalances(pubkey_or_label) {
        this.assertLogin()
        let public_key
        try {
            public_key = PublicKey.fromStringOrThrow(pubkey_or_label)
        } catch(e) { /* label */ }
        
    }

    /**
        Transfers a public balance from @from to one or more blinded balances using a stealth transfer.
        
        @arg {string} from_account_id_or_name
        @arg {string} asset_symbol
        @arg {array<string, number>} <from_key_or_label, amount> - from key_or_label to amount
        @arg {boolean} [broadcast = false]
        @return {Promise} reject ["unknown_from_account"|"unknown_asset"] resolve<object> blind_confirmation
    */
    transferToBlind( from_account_id_or_name, asset_symbol, to_amounts, broadcast = false ) {
         
        this.assertLogin()
        assert.equal(typeof from_account_id_or_name, "string", "from_account_id_or_name")
        assert.equal(typeof asset_symbol, "string", "asset_symbol")
        assert(Array.isArray( to_amounts ), "to_amounts should be an array")

        // Validate to_amounts, lookup or parse destination public key objects
        for( let to_amount of to_amounts) {
             assert(Array.isArray( to_amount ), 'to_amounts parameter should look like: [["alice",1]["bob",1]]')
             assert.equal(typeof to_amount[0], "string", 'to_amounts parameter should look like: [["alice",1]["bob",1]]')
             assert.equal(typeof to_amount[1], "number", 'to_amounts parameter should look like: [["alice",1]["bob",1]]')
             
             let public_key
             try { public_key = PublicKey.fromStringOrThrow(to_amount[0]) }
                catch(error) { public_key = this.getPublicKey(to_amount[0]) }
            
             assert(public_key, "Missing public key for " + to_amount[0])
             to_amount[0] = public_key
        }
         
        let promises = []
        promises.push(fetchChain("getAccount", from_account_id_or_name))
        promises.push(fetchChain("getAsset", asset_symbol))
         
        return Promise.all(promises).then( res =>{
            let [ account, asset ] = res
            if( ! account ) return Promise.reject("unknown_from_account")
            if( ! asset ) return Promise.reject("unknown_asset")

            for( let to_amount of to_amounts) {
                
            }
                 
        })
    }
     
    /**
        @return {List<blind_receipt>} all blind receipts to/form a particular account
    */
    blindHistory( pubkey_or_account ) {
        
        this.assertLogin()
        
    }
    
    /**
        Given a confirmation receipt, this method will parse it for a blinded balance and confirm that it exists in the blockchain.  If it exists then it will report the amount received and who sent it.

        @arg {string} confirmation_receipt - a base58 encoded stealth confirmation
        @arg {string} opt_from - if not empty and the sender is a unknown public key, then the unknown public key will be given the label opt_from
        @arg {string} opt_memo
        @return blind_receipt
    */
    receiveBlindTransfer( confirmation_receipt, opt_from, opt_memo ) {
        
        this.assertLogin()
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
    transferFromBlind( from_blind_account_key_or_label, to_account_id_or_name, amount, asset_symbol, broadcast = false ){
        this.assertLogin()
        
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
    blindTransfer( from_key_or_label, to_key_or_label, amount, symbol, broadcast = false ){
        this.assertLogin()
    }

}

var toString = data => data == null ? data :
    data["toString"] ? data.toString() : data // PublicKey.toString()

// required
function req(data, field_name) {
    if( data == null ) throw "Missing required field: " + field_name
    return data
}

function update(callback) {
    let wallet = callback(this.wallet.wallet_object)
    this.wallet.setState(wallet)
}

function assertLogin() {
    if( ! this.wallet.private_key )
        throw new Error("login")
}
