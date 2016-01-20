
/**
    Account names may contain one or more names separated by a dot.
    Each name needs to start with a letter and may contain
    numbers, or well placed dashes.
    @see is_valid_name graphene/libraries/chain/protocol/account.cpp
*/
export function is_account_name(value, allow_too_short = false) {
    var i, label, len, length, ref;
    
    if (is_empty(value)) {
        return false;
    }
    
    length = value.length;
    
    if ((!allow_too_short && length < 3) || length > 63) {
        return false;
    }
    
    ref = value.split('.');
    
    for (i = 0, len = ref.length; i < len; i++) {
        
        label = ref[i];
        
        if (!(/^[a-z][a-z0-9-]*$/.test(label) && !/--/.test(label) && /[a-z0-9]$/.test(label))) {
            return false;
        }
        
    }
    return true;
}

let id_regex = /\b\d+\.\d+\.(\d+)\b/;

export function is_object_id(obj_id) {
    if( 'string' != typeof obj_id )
        return false
    
    let match = id_regex.exec(obj_id)
    return (match !== null && obj_id.split(".").length === 3)
}

let is_empty = value => value == null || value.length === 0