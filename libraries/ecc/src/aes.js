// https://code.google.com/p/crypto-js
var CryptoJS = require("crypto-js");
var assert = require("assert");
var ByteBuffer = require("bytebuffer");
var Long = ByteBuffer.Long;
var hash = require('@graphene/hash');

class Aes {

    constructor(iv, key) { this.iv = iv, this.key = key; }
        
    clear() {return this.iv = this.key = undefined; }
    
    // TODO arg should be a binary type... HEX works best with crypto-js
    static fromSha512(hash) {
        assert.equal(hash.length, 128, `A Sha512 in HEX should be 128 characters long, instead got ${hash.length}`);
        var iv = CryptoJS.enc.Hex.parse(hash.substring(64, 96));
        var key = CryptoJS.enc.Hex.parse(hash.substring(0, 64));
        return new Aes(iv, key);
    };
    
    static fromSeed(seed) {
        if (seed === undefined) { throw new Error("seed is required"); }
        var _hash = hash.sha512(seed);
        _hash = _hash.toString('hex');
        // DEBUG console.log('... fromSeed _hash',_hash)
        return Aes.fromSha512(_hash);
    };
    
    //#* nonce is optional (null or empty string)
    static decrypt_with_checksum(private_key, public_key, nonce = "", message) {
        
        if (!Buffer.isBuffer(message)) {
            message = new Buffer(message, 'hex');
        }
        
        var S = private_key.get_shared_secret(public_key);
        
        // D E B U G
        // console.log('decrypt_with_checksum', {
        //     priv_to_pub: private_key.toPublicKey().toPublicKeyString()
        //     pub: public_key.toPublicKeyString()
        //     nonce: nonce
        //     message: message
        //     S: S
        // })
        
        var aes = fromSeed(Buffer.concat([
            // A null or empty string nonce will not effect the hash
            new Buffer(""+nonce), 
            new Buffer(S.toString('hex'))
        ]));
        var planebuffer = decrypt(message);
        if (!(planebuffer.length >= 4)) {
            throw new Error("Invalid key, could not decrypt message(1)");
        }
        
        // DEBUG console.log('... planebuffer',planebuffer)
        var checksum = planebuffer.slice(0, 4);
        var plaintext = planebuffer.slice(4);
        
        // DEBUG console.log('... checksum',checksum.toString('hex'))
        // DEBUG console.log('... plaintext',plaintext)
        
        var new_checksum = hash.sha256(plaintext);
        new_checksum = new_checksum.slice(0, 4);
        new_checksum = new_checksum.toString('hex');
        
        if (!(checksum.toString('hex') === new_checksum)) {
            throw new Error("Invalid key, could not decrypt message(2)");
        }
        
        return plaintext;
    };
    
    static encrypt_with_checksum(private_key, public_key, nonce = "", message) {
        
        if (!Buffer.isBuffer(message)) {
            message = new Buffer(message, 'binary');
        }
        
        var S = private_key.get_shared_secret(public_key);
        
        // D E B U G
        // console.log('encrypt_with_checksum', {
        //     priv_to_pub: private_key.toPublicKey().toPublicKeyString()
        //     pub: public_key.toPublicKeyString()
        //     nonce: nonce
        //     message: message
        //     S: S
        // })
        
        var aes = fromSeed(Buffer.concat([
            // A null or empty string nonce will not effect the hash
            new Buffer(""+nonce),
            new Buffer(S.toString('hex'))
        ]));
        // DEBUG console.log('... S',S.toString('hex'))
        var checksum = hash.sha256(message).slice(0,4);
        var payload = Buffer.concat([checksum, message]);
        // DEBUG console.log('... payload',payload.toString())
        return encrypt(payload);
    };
    
    _decrypt_word_array(cipher) {
        // https://code.google.com/p/crypto-js/#Custom_Key_and_IV
        // see wallet_records.cpp master_key::decrypt_key
        return CryptoJS.AES.decrypt({ ciphertext: cipher, salt: null}, this.key, {iv: this.iv});
    }
    
    _encrypt_word_array(plaintext) {
        //https://code.google.com/p/crypto-js/issues/detail?id=85
        var cipher = CryptoJS.AES.encrypt(plaintext, this.key, {iv: this.iv});
        return CryptoJS.enc.Base64.parse(cipher.toString());
    }

    decrypt(cipher_buffer) {
        if (typeof cipher_buffer === "string") {
            cipher_buffer = new Buffer(cipher_buffer, 'binary');
        }
        if (!Buffer.isBuffer(cipher_buffer)) {
            throw new Error("buffer required");
        }
        assert(cipher_buffer, "Missing cipher text");
        // hex is the only common format
        var hex = this.decryptHex(cipher_buffer.toString('hex'));
        return new Buffer(hex, 'hex');
    }
        
    encrypt(plaintext) {
        if (typeof plaintext === "string") {
            plaintext = new Buffer(plaintext, 'binary');
        }
        if (!Buffer.isBuffer(plaintext)) {
            throw new Error("buffer required");
        }
        //assert plaintext, "Missing plain text"
        // hex is the only common format
        var hex = this.encryptHex(plaintext.toString('hex'));
        return new Buffer(hex, 'hex');
    }

    encryptToHex(plaintext) {
        if (typeof plaintext === "string") {
            plaintext = new Buffer(plaintext, 'binary');
        }
        if (!Buffer.isBuffer(plaintext)) {
            throw new Error("buffer required");
        }
        //assert plaintext, "Missing plain text"
        // hex is the only common format
        return this.encryptHex(plaintext.toString('hex'));
    }
        
    decryptHex(cipher) {
        assert(cipher, "Missing cipher text");
        // Convert data into word arrays (used by Crypto)
        var cipher_array = CryptoJS.enc.Hex.parse(cipher);
        var plainwords = this._decrypt_word_array(cipher_array);
        return CryptoJS.enc.Hex.stringify(plainwords);
    }
    
    decryptHexToBuffer(cipher) {
        assert(cipher, "Missing cipher text");
        // Convert data into word arrays (used by Crypto)
        var cipher_array = CryptoJS.enc.Hex.parse(cipher);
        var plainwords = this._decrypt_word_array(cipher_array);
        var plainhex = CryptoJS.enc.Hex.stringify(plainwords);
        return new Buffer(plainhex, 'hex');
    }
    
    decryptHexToText(cipher) {
        return this.decryptHexToBuffer(cipher).toString('binary');
    }
    
    encryptHex(plainhex) {
        //assert plainhex, "Missing plain text"
        //console.log('... plainhex',plainhex)
        var plain_array = CryptoJS.enc.Hex.parse(plainhex);
        var cipher_array = this._encrypt_word_array(plain_array);
        return CryptoJS.enc.Hex.stringify(cipher_array);
    }
}

module.exports = Aes;

