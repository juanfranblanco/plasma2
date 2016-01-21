/**
    Provides @graphene/serializer compatiable types for this package.
    
    Because @graphene/serializer is not a required dependency of this package, this file is not exported in ./index.js and should instead be sourced directy.
*/
import { fp } from "@graphene/serializer"

var PublicKey = require('./key_public')
var Address = require('./address')

var Types
module.exports = Types = {}

// Types.public_key = {
//   _to_public: function(object) {
//     if (object.resolve !== void 0) {
//       object = object.resolve;
//     }
//     if (object.Q) {
//       return object;
//     }
//     return PublicKey.fromPublicKeyString(object);
//   },
//   fromByteBuffer: function(b) {
//     return fp_public_key(b);
//   },
//   appendByteBuffer: function(b, object) {
//     v.required(object);
//     fp_public_key(b, Types.public_key._to_public(object));
//   },
//   fromObject: function(object) {
//     v.required(object);
//     if (object.Q) {
//       return object;
//     }
//     return PublicKey.fromPublicKeyString(object);
//   },
//   toObject: function(object, debug) {
//     if (debug == null) {
//       debug = {};
//     }
//     if (debug.use_default && object === void 0) {
//       return "GPHXyz...public_key";
//     }
//     v.required(object);
//     return Types.public_key._to_public(object).toPublicKeyString();
//   }
// }
// 
// Types.address = {
//   _to_address: function(object) {
//     v.required(object);
//     if (object.addy) {
//       return object;
//     }
//     return Address.fromString(object);
//   },
//   fromByteBuffer: function(b) {
//     return new Address(fp.ripemd160(b));
//   },
//   appendByteBuffer: function(b, object) {
//     fp.ripemd160(b, Types.address._to_address(object).toBuffer());
//   },
//   fromObject: function(object) {
//     return Types.address._to_address(object);
//   },
//   toObject: function(object, debug) {
//     if (debug == null) {
//       debug = {};
//     }
//     if (debug.use_default && object === void 0) {
//       return "GPHXyz...address";
//     }
//     return Types.address._to_address(object).toString();
//   }
// }

function fp_public_key(b, public_key) {
    if (!b) { return; }
    if (public_key) {
        var buffer = public_key.toBuffer();
        b.append(buffer.toString('binary'), 'binary');
        return;
    } else {
        buffer = FastParser.fixed_data(b, 33);
        return PublicKey.fromBuffer(buffer);
    }
}