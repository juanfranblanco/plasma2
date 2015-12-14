
export function requestCode({ email, public_key }) {
    if( invalidEmail(email) ) throw ["invalid email", email]
    // public_key = toString(req(public_key, 'public_key'))
    return { type: "requestCode", email, public_key }
}


export function createWallet({ code, encrypted_data, signature }) {
    // encrypted_data = toBase64(req(encrypted_data, 'encrypted_data'))
    // signature = toBase64(req(signature, 'signature'))
    return { type: "createWallet", code, encrypted_data, signature }
}

export function fetchWallet({ public_key, local_hash }) {
    // public_key = toString(req(public_key, 'public_key'))
    // local_hash = toBase64(local_hash)
    return { type: "fetchWallet", public_key, local_hash }
}


export function saveWallet({ original_local_hash, encrypted_data, signature }) {
    // original_local_hash = toBase64(req(original_local_hash, 'original_local_hash'))
    // encrypted_data = toBase64(req(encrypted_data, 'encrypted_data'))
    // signature = toBase64(req(signature, 'signature'))
    return { type: "saveWallet", original_local_hash, encrypted_data, signature }
}


export function changePassword({ original_local_hash, original_signature, new_encrypted_data, new_signature }) {
    // original_local_hash = toBase64(req(original_local_hash, 'original_local_hash'))
    // original_signature = toBase64(req(original_signature, 'original_signature'))
    // new_encrypted_data = toBase64(req(new_encrypted_data, 'new_encrypted_data'))
    // new_signature = toBase64(req(new_signature, 'new_signature'))
    return { type: "changePassword", original_local_hash, original_signature, new_encrypted_data, new_signature }
}


export function deleteWallet({ local_hash, signature }) {
    // local_hash = toBase64(req(local_hash, 'local_hash'))
    // signature = toBase64(req(signature, 'signature'))
    return { type: "deleteWallet", local_hash, signature }
}

// No spaces, only one @ symbol, any character for the email name (not completely complient but safe),
// only valid domain name characters...  Single letter domain is allowed, top level domain has at
// least 2 characters.
var invalidEmail = email => ! email || ! /^[^ ^@.]+@[a-z0-9][\.a-z0-9_-]*\.[a-z0-9]{2,}$/i.test( email )
// 
// var toBase64 = data => data == null ? data :
//     data["toBuffer"] ? data.toBuffer().toString('base64') :
//     Buffer.isBuffer(data) ? data.toString('base64') : data
// 
// var toString = data => data == null ? data :
//     data["toString"] ? data.toString() : data // PublicKey.toString()
// 
// function req(data, field_name) {
//     if( data == null ) throw "Missing required field: " + field_name
//     return data
// }