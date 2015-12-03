var ecdsa = require('./ecdsa');
var hash = require('@graphene/hash');
var curve = require('ecurve').getCurveByName('secp256k1');
var assert = require('assert');
var BigInteger = require('bigi');
var PublicKey = require('./key_public');

class Signature {

    constructor(r1, s1, i1) {
        this.r = r1;
        this.s = s1;
        this.i = i1;
        assert.equal(this.r !== null, true, 'Missing parameter');
        assert.equal(this.s !== null, true, 'Missing parameter');
        assert.equal(this.i !== null, true, 'Missing parameter');
    }

    static fromBuffer(buf) {
        var i, r, s;
        assert.equal(buf.length, 65, 'Invalid signature length');
        i = buf.readUInt8(0);
        assert.equal(i - 27, i - 27 & 7, 'Invalid signature parameter');
        r = BigInteger.fromBuffer(buf.slice(1, 33));
        s = BigInteger.fromBuffer(buf.slice(33));
        return new Signature(r, s, i);
    };

    toBuffer() {
        var buf;
        buf = new Buffer(65);
        buf.writeUInt8(this.i, 0);
        this.r.toBuffer(32).copy(buf, 1);
        this.s.toBuffer(32).copy(buf, 33);
        return buf;
    };

    recoverPublicKeyFromBuffer(buffer) {
        return this.recoverPublicKey(hash.sha256(buffer));
    };

    recoverPublicKey(sha256_buffer) {
        var Q, e, i;
        e = BigInteger.fromBuffer(sha256_buffer);
        i = this.i;
        i = i & 3;
        Q = ecdsa.recoverPubKey(curve, e, this, i);
        return PublicKey.fromPoint(Q);
    };


    /*
    @param {Buffer}
    @param {./PrivateKey}
    @param {./PublicKey} optional for performance
    @return {./Signature}
    */

    static signBuffer(buf, private_key, public_key) {
        var _hash, der, e, ecsignature, i, lenR, lenS, nonce;
        i = null;
        nonce = 0;
        _hash = hash.sha256(buf);
        e = BigInteger.fromBuffer(_hash);
        while (true) {
          ecsignature = ecdsa.sign(curve, _hash, private_key.d, nonce++);
          der = ecsignature.toDER();
          lenR = der[3];
          lenS = der[5 + lenR];
          if (lenR === 32 && lenS === 32) {
            i = ecdsa.calcPubKeyRecoveryParam(curve, e, ecsignature, private_key.toPublicKey().Q);
            i += 4;
            i += 27;
            break;
          }
          if (nonce % 10 === 0) {
            console.log("WARN: " + nonce + " attempts to find canonical signature");
          }
        }
        return new Signature(ecsignature.r, ecsignature.s, i);
    };

    static sign(string, private_key) {
        return Signature.signBuffer(new Buffer(string), private_key);
    };


    /**
    @param {Buffer} un-hashed
    @param {./PublicKey}
    @return {boolean}
    */

    verifyBuffer(buf, public_key) {
        var _hash;
        _hash = hash.sha256(buf);
        return this.verifyHash(_hash, public_key);
    };

    verifyHash(hash, public_key) {
        assert.equal(hash.length, 32, "A SHA 256 should be 32 bytes long, instead got " + hash.length);
        return ecdsa.verify(curve, hash, {
          r: this.r,
          s: this.s
        }, public_key.Q);
    };


    /* <HEX> */

    toByteBuffer() {
        var b;
        b = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
        this.appendByteBuffer(b);
        return b.copy(0, b.offset);
    };

    static fromHex(hex) {
        return Signature.fromBuffer(new Buffer(hex, "hex"));
    };

    toHex() {
        return this.toBuffer().toString("hex");
    };

    static signHex(hex, private_key) {
        var buf;
        buf = new Buffer(hex, 'hex');
        return this.signBuffer(buf, private_key);
    };

    verifyHex(hex, public_key) {
        var buf;
        buf = new Buffer(hex, 'hex');
        return this.verifyBuffer(buf, public_key);
    };

}

module.exports = Signature;