/** A protocol between the web browser and the server for storing and retrieving data.
    
    @see [Wallet Server Architecture]{@link https://github.com/cryptonomex/graphene/wiki/Wallet-Server-Architecture}
*/
export default {}

/**
    ```bash
    curl http://localhost:9080/requestCode?email=alice@example.com
    ```
    @see {string} code - in email
    @param {string} email
*/
export function requestCode({ email }) {
    if( ! email ) throw "requestCode.email required"
    // No spaces, only one @ symbol, any character for the email name (not completely complient),
    // only valid domain name characters...  Single letter domain is allowed.
    if( ! /^[^ ^@.]+@[a-z0-9][\.a-z0-9_-]*\.[a-z0-9]{2,}$/i.test( email )) throw "requestCode.email invalid"
    return { type: "requestCode", email }
}

/** 
 * Create or save a wallet on the server.
 * 
 * Note, the filename=encrypted_data is required.  This command is intended to pro
 * ```bash
 * curl -X POST -F "fileupload=@mywallet.bin;filename=encrypted_data" -F code=22 -F signature=01aaeeff http://localhost:9080/createWallet
 * ```
 * @param {Object} param - Values from API call
 * @param {string} param.code - from {@link requestCode}
 * @param {string} param.encrypted_data - Binary Buffer
 * @param {string} param.signature - base64
 */
export function createWallet({ code, encrypted_data, signature }) {
    return { type: "createWallet", code, encrypted_data, signature }
}

/** Requesting AND validating a new code will invalidate a prior code.  
    @param {Object} param - Values from API call
    @param {string} param.public_key - derived from {@link createWallet.encrypted_data} and {@link createWallet.signature}
    @param {string} param.code - from {@link requestCode} Code is always required and must be the most recent code that was emailed and validated.
    @param {string} [param.local_hash = null] - base64 sha1 of {@link createWallet.encrypted_data} optional and used to determine if data should be returned or if the server's wallet is identical to the client's wallet.
    @return {string} encrypted_data - base64
*/
export function fetchWallet({ public_key, code, local_hash = null }) {
    return { type: "fetchWallet", public_key, code, local_hash }
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
/** @param {Object} param - Values from API call
    @param {string} param.encrypted_data - base64
    @param {string} param.signature - base64
    @return {WalletStatistics>}
*/
export function saveWallet({ encrypted_data, signature }) {
    return { type: "saveWallet", encrypted_data, signature }
}

/** After this call the public key used to lookup this wallet will be the one derived from new_signature and encrypted_data. A wallet must exist at the old_public_key derived from old_signature.

    @param {Object} param - Values from API call
    @param {string} param.encrypted_data - base64
    @param {string} param.old_signature - base64
    @param {string} param.new_signature - base64
*/
export function changePassword({ encrypted_data, old_signature, new_signature }) {
    return { type: "changePassword", encrypted_data, old_signature, new_signature }
}
