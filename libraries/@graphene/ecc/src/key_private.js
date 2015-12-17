var ecurve = require('ecurve');
var Point = ecurve.Point;
var secp256k1 = ecurve.getCurveByName('secp256k1');
var BigInteger = require('bigi');
var base58 = require('bs58');
var assert = require('assert');
var hash = require('./hash');
var PublicKey = require('./key_public');

class PrivateKey {

  /**
  @param {BigInteger}
  */
  constructor(d) { this.d = d; }

  static fromBuffer(buf) {
    if (!Buffer.isBuffer(buf)) {
      throw new Error("Expecting paramter to be a Buffer type");
    }
    if (32 !== buf.length) {
      console.log(
          `WARN: Expecting 32 bytes, instead got ${buf.length}, stack trace:`,
          new Error().stack);
    }
    if (buf.length === 0) {
      throw new Error("Empty buffer");
    }
    return new PrivateKey(BigInteger.fromBuffer(buf));
  };

  /** Generate private key */
  static fromSeed(seed) {
    if (!(typeof seed === 'string')) {
      throw new Error('seed must be of type string');
    }
    return PrivateKey.fromBuffer(hash.sha256(seed));
  };

  static fromWif(_private_wif) {
    var private_wif = new Buffer(base58.decode(_private_wif));
    var version = private_wif.readUInt8(0);
    assert.equal(0x80, version, `Expected version ${0x80}, instead got ${version}`);
    // checksum includes the version
    var private_key = private_wif.slice(0, -4);
    var checksum = private_wif.slice(-4);
    var new_checksum = hash.sha256(private_key);
    new_checksum = hash.sha256(new_checksum);
    new_checksum = new_checksum.slice(0, 4);
    assert.deepEqual(checksum, new_checksum); //, 'Invalid checksum'
    private_key = private_key.slice(1);
    return PrivateKey.fromBuffer(private_key);
  };

  toWif() {
    var private_key = this.toBuffer();
    // checksum includes the version
    private_key = Buffer.concat([ new Buffer([ 0x80 ]), private_key ]);
    var checksum = hash.sha256(private_key);
    checksum = hash.sha256(checksum);
    checksum = checksum.slice(0, 4);
    var private_wif = Buffer.concat([ private_key, checksum ]);
    return base58.encode(private_wif);
  }

  /**
  @return {Point}
  */
  toPublicKeyPoint() {
    var Q;
    return Q = secp256k1.G.multiply(this.d);
  }

  toPublicKey() {
    if (this.public_key) {
      return this.public_key;
    }
    return this.public_key = PublicKey.fromPoint(this.toPublicKeyPoint());
  }

  toBuffer() { return this.d.toBuffer(32); }

  /** ECIES */
  get_shared_secret(public_key) {
    var x;
    var y;
    var KB = public_key.toUncompressed().toBuffer();
    var KBP =
        Point.fromAffine(secp256k1, x = BigInteger.fromBuffer(KB.slice(1, 33)),
                         y = BigInteger.fromBuffer(KB.slice(33, 65)));
    var r = this.toBuffer();
    var P = KBP.multiply(BigInteger.fromBuffer(r));
    var S = P.affineX.toBuffer({size : 32});
    // SHA512 used in ECIES
    return hash.sha512(S);
  }

  // <helper_functions> */

  toByteBuffer() {
    var b =
        new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
    this.appendByteBuffer(b);
    return b.copy(0, b.offset);
  }

  static fromHex(hex) { return PrivateKey.fromBuffer(new Buffer(hex, 'hex')); };

  toHex() { return this.toBuffer().toString('hex'); }
}

module.exports = PrivateKey;