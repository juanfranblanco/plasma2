import assert from "assert"
import { fromJS, Map, List } from "immutable"
import { PrivateKey, PublicKey, Aes, brainKey, hash, key } from "@graphene/ecc"
import { fetchChain, config, Apis, TransactionBuilder } from "@graphene/chain"
import { ops } from "@graphene/serializer"
import AddressIndex from "./AddressIndex"

import ByteBuffer from "bytebuffer"


let { stealth_memo_data } = ops

// /**
//     This is for documentation purposes..
//     Serilizable persisterent state (JSON serilizable types only)..  
// */
// const empty_wallet = fromJS({
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
//             private_wif: t.Str, // was: encrypted_key: t.Str
//             index_address: false // Mark legacy keys for address indexing (addresses are calculated outside of this wallet backup)  
//         }
//         
// })

/** This class is used for stealth transfers */
export default class ConfidentialWallet {
    
    constructor( walletStorage ) {
        
        this.wallet = req(walletStorage, "walletStorage")
        
        // Convenience function to access this object (ensures an empty Map)
        this.keys = () => this.wallet.wallet_object.getIn(["keys"], Map())
        
        // BTS 1.0 addresses for shorts and balance claims
        this.addressIndex = new AddressIndex()
        // this.addressIndex.add( indexableKeys( this.keys() ))
        
        // semi-private methods (outside of this API)
        this.update = update.bind(this)// update the wallet object
        this.assertLogin = assertLogin.bind(this)
        this.getPubkeys_having_PrivateKey = getPubkeys_having_PrivateKey.bind(this)
    }
    
    /**
        This method can be used to set or change the label for a public_key.

        This is a one-to-one: one key per label, one label per key.  If there is a conflict, the label is renamed.  A label is optional so their may be any number of unlabeled keys. 

        @arg {PrivateKey|PublicKey|string} key - Key object or public_key string (like: GPHXyz...)
        
        @arg {string} [label = null] - string (like: GPHXyz...).  Required if a private key is not provided.  If provided, must be unique or this method will return false.
        
        @arg {boolean} [index_address = false] - set truthy only if this could be a BTS 1.0 key having a legacy address format (Protoshares, etc.).  Unless true, the user may not see some shorts or balance claims.  A private key object is requred if this is used.
        
        @arg {PublicKey|string} public_key - this is provided for performanc gains where it is already known.  A private key object is requred if this is used.
        
        @return {boolean} false if this label is already assigned, otherwise a wallet update is sent over to the WalletStorage object.
     */
    setKeyLabel( key, label = null, index_address = false, public_key = null ) {
        
        this.assertLogin()
        assert( key, "key is required (a public or private key)" )
        
        let private_key
        if(key.d) {
            private_key = key
        } else {
            if( ! public_key )
                public_key = key
        }
        
        if( ! public_key ) {
            assert( private_key.d, "PrivateKey object is required since public key was not provided")
            public_key = private_key.toPublicKey()
        }
        private_key = toString(private_key)
        public_key = toString(public_key)

        // req(label, 'label')
        if( index_address ) {
            req(private_key, "private_key required to derive addresses")
        }
        
        if( ! label )
            req(private_key, "Label is required unless a private key is provided")
        
        let keys = this.keys()
        if( label ) {
            let key = keys.find( key => key.get("label") === label )
            if( key != null )
                // this label is already assigned
                return false
        }
        let indexables = List().asMutable()
        this.update(wallet =>
            wallet.updateIn(["keys", public_key], Map(),
                key => key.withMutations( key =>{
                    if( label ) key.set("label", label)
                    if( index_address )
                        key.set("index_address", true)
                    
                    if( private_key )
                        key.set("private_wif", private_key)
                    
                    if( index_address )
                        indexables.push(public_key)
                    
                    return key
                })
            )
        )
        this.addressIndex.add( indexables )
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
        
        let keys = this.keys()
        let pubkey = keys.findKey( key => key.get("label") === label )
        if( ! pubkey)
            return null
        
        return PublicKey.fromStringOrThrow( pubkey )
    }
    
    /**
        @arg {PublicKey|string} pubkey_or_label - public key string or object or label
        @return {PrivateKey} or null
    */
    getPrivateKey( pubkey_or_label ) {
        
        this.assertLogin()
        req(pubkey_or_label, "pubkey_or_label")
        
        let keys = this.keys()
        let getPub = pubkey => {
            let key = keys.get( pubkey )
            if( ! key )
                return null
            
            let wif = key.get("private_wif")
            if( ! wif )
                return null
            return PrivateKey.fromWif( wif )
        }
        
        if( pubkey_or_label.Q ) {
            return getPub( pubkey_or_label.toString() )
        }
        try {
            PublicKey.fromStringOrThrow( pubkey_or_label )
            return getPub( pubkey_or_label )
        } catch(error) {
            // probably the slowest operation (last)
            return this.getPublicKey( pubkey_or_label )
        }
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
                key => key.set("private_wif", private_key.toWif()))
        )
        
        return public_key
    }
    
    /** @return {Map<label, pubkey>} all blind accounts */
    getBlindAccounts() {
        this.assertLogin()
        let keys = this.keys()
        return keys.reduce( (r, key, pubkey) => r.set(key.get("label"), pubkey), Map())
    }
    
    /** @return {Map<label, pubkey>} all blind accounts for which this wallet has the private key */
    getMyBlindAccounts() {
        this.assertLogin()
        let keys = this.keys()
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
        @arg {array<string, number>} <from_key_or_label, amount> - from key_or_label to amount (destination public_key or key label)
        @arg {boolean} [broadcast = false]
        @return {Promise} reject ["unknown_from_account"|"unknown_asset"] resolve<object> blind_confirmation
    */
    transferToBlind( from_account_id_or_name, asset_symbol, to_amounts, broadcast = false ) {
         
        this.assertLogin()
        assert.equal(typeof from_account_id_or_name, "string", "from_account_id_or_name")
        assert.equal(typeof asset_symbol, "string", "asset_symbol")
        assert(Array.isArray( to_amounts ), "to_amounts should be an array")

        let idx = 0
        // Validate to_amounts, lookup or parse destination public_key or key label (from_key_or_label)
        for( let to_amount of to_amounts) {
             assert(Array.isArray( to_amount ), 'to_amounts parameter should look like: [["alice",1],["bob",1]]')
             assert.equal(typeof to_amount[0], "string", 'to_amounts parameter should look like: [["alice",1],["bob",1]]')
             assert.equal(typeof to_amount[1], "number", 'to_amounts parameter should look like: [["alice",1],["bob",1]]')
             
             let public_key
             try { public_key = PublicKey.fromStringOrThrow(to_amount[0]) }
                catch(error) { public_key = this.getPublicKey(to_amount[0]) }
            
             assert(public_key, "Unknown to_amounts[" + (idx++) + "][0] (from_key_or_label): " + to_amount[0])
             to_amount[3] = public_key
        }
         
        let promises = []
        promises.push(fetchChain("getAccount", from_account_id_or_name))
        promises.push(fetchChain("getAsset", asset_symbol))
        
        return Promise.all(promises).then( res =>{
            let [ account, asset ] = res
            if( ! account ) return Promise.reject("unknown_from_account")
            if( ! asset ) return Promise.reject("unknown_asset")

            let promises = []
            let total_amount = 0
            let blinding_factors = []
            let bop = {
                from: account.get("id"),
                outputs: []
            }
            let confirm = {
                outputs: []
            }
            
            for( let to_amount of to_amounts) {
                
                let label = to_amount[0]
                let amount = to_amount[1]
                let to_public = to_amount[3]
                
                let one_time_private = key.get_random_key()
                let secret = one_time_private.get_shared_secret( to_public )
                let child = hash.sha256( secret )
                let nonce = hash.sha256( one_time_private.toBuffer() )
                let blind_factor = hash.sha256( child )
                
                blinding_factors.push( blind_factor.toString("hex") )
                total_amount += amount
                
                let out = {}, conf_output
                
                let derived_child = to_public // to_public.child( child ) // TODO 
                out.owner = { weight_threshold: 1, key_auths: [[ derived_child, 1 ]],
                    account_auths: [], address_auths: []}
                
                promises.push(
                    Apis.crypto("blind", blind_factor, amount)
                    .then( ret =>{ out.commitment = ret })
                    .then( ()=>
                        to_amounts.length > 1 ?
                            out.range_proof = Apis.crypto(
                                "range_proof_sign", 0, out.commitment,
                                blind_factor, nonce,
                                0, 0, amount
                            )
                        : null
                    )
                    .then(()=> {
                        conf_output = {
                            label,
                            pub_key: to_public.toString(),
                            decrypted_memo: {
                                amount: { amount, asset_id: asset.get("id") },
                                blinding_factor: blind_factor,
                                commitment: out.commitment,
                                check: bufferToNumber(secret.slice(0, 4)),
                            },
                            confirmation: {
                                one_time_key: one_time_private.toPublicKey().toString(),
                                to: to_public.toString(),
                            }
                        }
                        let memo = stealth_memo_data.toBuffer( conf_output.decrypted_memo )
                        conf_output.confirmation.encrypted_memo = Aes.fromBuffer(secret).encrypt( memo )
                        conf_output.confirmation_receipt = conf_output.confirmation
                        
                        bop.outputs.push( out )
                        confirm.outputs.push( conf_output )
                    })
                    
                )
            }
            // transfer_to_blind
            // fee: asset,
            // amount: asset,
            // from: protocol_id_type("account"),
            // blinding_factor: bytes(32),
            // outputs: array(blind_output)
            
            return Promise.all(promises).then(()=>{
                bop.amount = { amount: total_amount, asset_id: asset.get("id") }
                return Apis.crypto("blind_sum", blinding_factors, blinding_factors.length)
                    .then( res => bop.blinding_factor = res )
                    .then( ()=>{
                        // confirm.trx.operations.push( bop )
                        let tr = new TransactionBuilder()
                        bop.outputs = bop.outputs.sort((a, b)=> a.commitment > b.commitment)
                        tr.add_type_operation("transfer_to_blind", bop)
                        return tr.process_transaction(this, null, broadcast).then(()=> {
                            confirm.trx = tr.serialize()
                            if( broadcast ) {
                                for(let out in bop.outputs) {
                                    // receive_blind_transfer( out.confirmation_receipt, "@"+from_account.name, "from @"+from_account.name)
                                }
                            }
                            return confirm
                        })
                    })
            })
            
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

// receive_blind_transfer( string confirmation_receipt, string opt_from, string opt_memo )
// {
//    FC_ASSERT( !is_locked() );
//    stealth_confirmation conf(confirmation_receipt);
//    FC_ASSERT( conf.to );
// 
//    blind_receipt result;
//    result.conf = conf;
// 
//    auto to_priv_key_itr = my->_keys.find( *conf.to );
//    FC_ASSERT( to_priv_key_itr != my->_keys.end(), "No private key for receiver", ("conf",conf) );
// 
// 
//    auto to_priv_key = wif_to_key( to_priv_key_itr->second );
//    FC_ASSERT( to_priv_key );
// 
//    auto secret       = to_priv_key->get_shared_secret( conf.one_time_key );
//    auto child        = fc::sha256::hash( secret );
// 
//    auto child_priv_key = to_priv_key->child( child );
//    //auto blind_factor = fc::sha256::hash( child );
// 
//    auto plain_memo = fc::aes_decrypt( secret, conf.encrypted_memo );
//    auto memo = fc::raw::unpack<stealth_confirmation::memo_data>( plain_memo );
// 
// 
//    result.to_key   = *conf.to;
//    result.to_label = get_key_label( result.to_key );
//    if( memo.from ) 
//    {
//       result.from_key = *memo.from;
//       result.from_label = get_key_label( result.from_key );
//       if( result.from_label == string() )
//       {
//          result.from_label = opt_from;
//          set_key_label( result.from_key, result.from_label );
//       }
//    }
//    else
//    {
//       result.from_label = opt_from;
//    }
//    result.amount = memo.amount;
//    result.memo = opt_memo;
// 
//    // confirm the amount matches the commitment (verify the blinding factor)
//    auto commtiment_test = fc::ecc::blind( memo.blinding_factor, memo.amount.amount.value );
//    FC_ASSERT( fc::ecc::verify_sum( {commtiment_test}, {memo.commitment}, 0 ) );
//    
//    auto bbal = my->_remote_db->get_blinded_balances( {memo.commitment} );
//    FC_ASSERT( bbal.size(), "commitment not found in blockchain", ("memo",memo) );
// 
//    blind_balance bal;
//    bal.amount = memo.amount;
//    bal.to     = *conf.to;
//    if( memo.from ) bal.from   = *memo.from;
//    bal.one_time_key = conf.one_time_key;
//    bal.blinding_factor = memo.blinding_factor;
//    bal.commitment = memo.commitment;
//    bal.used = false;
// 
//    result.control_authority = bbal.front().owner;
//    result.data = memo;
// 
// 
//    auto child_key_itr = bbal.front().owner.key_auths.find( child_priv_key.get_public_key() );
// 
//    if( child_key_itr != bbal.front().owner.key_auths.end() )
//       my->_keys[child_key_itr->first] = key_to_wif( child_priv_key );
// 
// 
//    // my->_wallet.blinded_balances[memo.amount.asset_id][bal.to].push_back( bal );
// 
//    result.date = fc::time_point::now();
//    my->_wallet.blind_receipts.insert( result );
//    my->_keys[child_priv_key.get_public_key()] = key_to_wif( child_priv_key );
// 
//    save_wallet_file();
// 
//    return result;
// }

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

var toString = data => data == null ? data :
    data["toWif"] ? data.toWif() : // Case for PrivateKey.toWif()
    data["toString"] ? data.toString() : // Case for PublicKey.toString()
    data

let bufferToNumber = (buf, type = "Uint32") => 
    new ByteBuffer.fromBinary(buf.toString("binary"))["read" + type]()

// let indexableKeys = keys => keys
//     .reduce( (r, key, pubkey) => key.get("index_address") ? r.push(pubkey) : r, List())

// const blind_receipt = fromJS({
//     date: null,
//     from_key: null,
//     from_label: null,
//     to_key: null,
//     to_label: null,
//     amount: null,// serializer_operations::asset
//     memo: null,// String
//     authority: null,
//     stealth_memo_data: null,
//     used: false,
//     stealth_confirmation: null // serializer_operations::stealth_confirmation
// })

function getPubkeys_having_PrivateKey( pubkeys, addys = null ) {
    var return_pubkeys = []
    let keys = this.keys()
    if(pubkeys) {
        for(let pubkey of pubkeys) {
            let key = keys.get(pubkey)
            if(key && key.has("private_wif")) {
                return_pubkeys.push(pubkey)
            }
        }
    }
    if(addys) {
        for (let addy of addys) {
            var pubkey = this.addressIndex.getPublicKey(addy)
            return_pubkeys.push(pubkey)
        }
    }
    return return_pubkeys
}

