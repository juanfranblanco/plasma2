
/**
    Serilizable persisterent state (JSON serilizable types only)..
*/
const empty_wallet = Map({
    
    //  [[LABEL,KEY],...] No two keys can have the same label
    labeled_keys: {},
    
    // [blind_receipt,...]
    blind_receipts: []

})

const authority = Map({
    "weight_threshold": 1,
    "account_auths": [ /* [ "1.2.0", 0 ], [account_id, weight], ... */ ],
    "key_auths": [ /* [ "GPHXyz...public_key", 0 ], [public_key, weight], ... */ ],
    "address_auths": [ /* [ "GPHXyz...address", 0 ], [public_key, weight], ... */ ]
})

const blind_receipt = Map({
    
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
        this.wallet = wallet
    }
    
    
    /**
     *  This method can be used to set or change the label for a public_key.
     *
     *  @note No two keys can have the same label, a label may be renamed 
     *
     *  @arg {string|PublicKey} - public_key string (like: GPHXyz...)
     *  @arg {string} - label string (like: GPHXyz...)
     *  @return {Promise} resolve if the label was set, otherwise reject
     */
    setKeyLabel(public_key, label) {
        public_key = toString(req(public_key, "public_key")
        req(label, 'label')
        return this.wallet.getState( wallet_object => {
            if( ! wallet_object )
                wallet_object = empty_wallet
            
            let labeled_keys = wallet_object.get("labeled_keys")
            labeled_keys[label] = public_key
            
        })
        
    }
    
    // string                      get_key_label( public_key_type )const;
    // 
    // /**
    //  *  Generates a new blind account for the given brain key and assigns it the given label.
    //  */
    // public_key_type             create_blind_account( string label, string brain_key  );
    // 
    // /**
    //  * @return the total balance of all blinded commitments that can be claimed by the
    //  * given account key or label
    //  */
    // vector<asset>                get_blind_balances( string key_or_label );
    // /** @return all blind accounts */
    // map<string,public_key_type> get_blind_accounts()const;
    // /** @return all blind accounts for which this wallet has the private key */
    // map<string,public_key_type> get_my_blind_accounts()const;
    // /** @return the public key associated with the given label */
    // public_key_type             get_public_key( string label )const;
    // ///@}
    // 
    // /**
    //  * @return all blind receipts to/form a particular account
    //  */
    // vector<blind_receipt> blind_history( string key_or_account );
    // 
    // /**
    //  *  Given a confirmation receipt, this method will parse it for a blinded balance and confirm
    //  *  that it exists in the blockchain.  If it exists then it will report the amount received and
    //  *  who sent it.
    //  *
    //  *  @param opt_from - if not empty and the sender is a unknown public key, then the unknown public key will be given the label opt_from
    //  *  @param confirmation_receipt - a base58 encoded stealth confirmation 
    //  */
    // blind_receipt receive_blind_transfer( string confirmation_receipt, string opt_from, string opt_memo );
    // 
    // /**
    //  *  Transfers a public balance from @from to one or more blinded balances using a
    //  *  stealth transfer.
    //  */
    // blind_confirmation transfer_to_blind( string from_account_id_or_name, 
    //                                       string asset_symbol,
    //                                       /** map from key or label to amount */
    //                                       map<string, string> to_amounts, 
    //                                       bool broadcast = false );
    // 
    // /**
    //  * Transfers funds from a set of blinded balances to a public account balance.
    //  */
    // blind_confirmation transfer_from_blind( 
    //                                       string from_blind_account_key_or_label,
    //                                       string to_account_id_or_name, 
    //                                       string amount,
    //                                       string asset_symbol,
    //                                       bool broadcast = false );
    // 
    // /**
    //  *  Used to transfer from one set of blinded balances to another
    //  */
    // blind_confirmation blind_transfer( string from_key_or_label,
    //                                    string to_key_or_label,
    //                                    string amount,
    //                                    string symbol,
    //                                    bool broadcast = false );
    
}

var toString = data => data == null ? data :
    data["toString"] ? data.toString() : data // PublicKey.toString()

// required
function req(data, field_name) {
    if( data == null ) throw "Missing required field: " + field_name
    return data
}

// {
//    "labeled_keys" : [[LABEL,KEY],...], 
//    "blind_receipts" : [ {
//           fc::time_point                  date;
//           public_key_type             from_key;
//           string                              from_label;
//           public_key_type             to_key;
//           string                              to_label;
//           asset                              amount;
//           string                              memo;
//           authority                         control_authority;
//           stealth_confirmation::memo_data data;
//           bool                                used = false;
//           stealth_confirmation       conf;
//    },...] 
// }

// /**
//  *  When sending a stealth tranfer we assume users are unable to scan
//  *  the full blockchain; therefore, payments require confirmation data
//  *  to be passed out of band.   We assume this out-of-band channel is
//  *  not secure and therefore the contents of the confirmation must be
//  *  encrypted. 
//  */
// struct stealth_confirmation
// {




