/** A protocol between the web browser and the server for storing and retrieving data.
    @see [Wallet Server Architecture]{@link https://github.com/cryptonomex/graphene/wiki/Wallet-Server-Architecture}
*/

/**
    ```bash
    curl http://localhost:9080/requestCode?email=alice@example.com
    ```
    @see {string} code - base58 encoded string (arrives in email)
    @arg {string} email
*/
export function requestCode({ email }) {
    if( invalidEmail(email) ) throw ["invalid email", email]
    return { type: "requestCode", email }
}

/** 
    Create or save a wallet on the server.  The wallet will be saved on the server using the public_key derived from encrypted_data and signature.  This public key will be derived from the password but should additionally be seeded with the email address.
 
    Note, the filename=encrypted_data is required.  This command is intended to pro
    ```bash
    curl -X POST -F "fileupload=@mywallet.bin;filename=encrypted_data" -F code=22 -F signature=01aaeeff http://localhost:9080/createWallet
    ```
    @arg {Object} createWallet - Values from API call
    @arg {string} createWallet.code - from {@link requestCode}
    @arg {string} createWallet.encrypted_data - Binary string
    @arg {string} createWallet.signature - Binary string
 */
export function createWallet({ code, encrypted_data, signature }) {
    return { type: "createWallet", code, encrypted_data, signature }
}

/** Requesting AND validating a new code will invalidate a prior code.  
    @arg {Object} fetchWallet - Values from API call
    @arg {string} fetchWallet.public_key - derived from {@link createWallet.signature}
    @arg {string} [fetchWallet.local_hash = null] - base64 sha256 of {@link createWallet.encrypted_data} optional and used to determine if data should be returned or if the server's wallet is identical to the client's wallet.
    @return {string} encrypted_data - base64
*/
export function fetchWallet({ public_key, local_hash }) {
    return { type: "fetchWallet", public_key, local_hash }
}

/** @typedef Date - ISO 8601 as returned by `new Date().toISOString()` and read by `new Date(...)`.
    Example: 2015-11-11T19:43:58.181Z
    @type {string}
*/
/** @typedef WalletStatistics
    @type {object}
    @property {Date} last_updated
    @property {Object[]} access_log
    @property {string} access_log[].ip_address - v4 or v6
    @property {string} access_log[].date
*/
/** @arg {Object} saveWallet - Values from API call
    @arg {string} local_hash base64 hash of the wallet being replaced.  A bad request will occure if this does not match.
    @arg {string} saveWallet.encrypted_data - binary
    @arg {string} saveWallet.signature - base64
    @return {WalletStatistics>}
*/
export function saveWallet({ original_local_hash, encrypted_data, signature }) {
    return { type: "saveWallet", original_local_hash, encrypted_data, signature }
}

/** After this call the public key used to lookup this wallet will be the one derived from new_signature and encrypted_data. A wallet must exist at the old_public_key derived from old_signature.

    @arg {Object} param - Values from API call
    @arg {string} param.encrypted_data - base64
    @arg {string} param.old_signature - base64
    @arg {string} param.new_signature - base64
*/
export function changePassword({ original_local_hash, original_signature, new_encrypted_data, new_signature }) {
    return { type: "changePassword", original_local_hash, original_signature, new_encrypted_data, new_signature }
}

/** Permanently remove a wallet.
    @arg {string} deleteWallet.local_hash - base64 sha256 encrypted_data
    @arg {string} deleteWallet.signature - base64
*/
export function deleteWallet({ local_hash, signature }) {
    return { type: "deleteWallet", local_hash, signature }
}

// No spaces, only one @ symbol, any character for the email name (not completely complient but safe),
// only valid domain name characters...  Single letter domain is allowed, top level domain has at
// least 2 characters.
var invalidEmail = email => ! email || ! /^[^ ^@.]+@[a-z0-9][\.a-z0-9_-]*\.[a-z0-9]{2,}$/i.test( email )
