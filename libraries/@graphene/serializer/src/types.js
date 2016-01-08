
// Low-level types that make up operations

var ByteBuffer = require('bytebuffer');
var Serializer = require('./serializer');
var v = require('./validation');
var ObjectId = require('./object_id')
var fp = require('./fast_parser');
var chain_types = require('./chain_types')

var Types = {}
module.exports = Types

const HEX_DUMP = process.env.npm_config__graphene_serializer_hex_dump

Types.uint8 = {
  fromByteBuffer: function(b) {
    return b.readUint8();
  },
  appendByteBuffer: function(b, object) {
    v.require_range(0, 0xFF, object, "uint8 " + object);
    b.writeUint8(object);
  },
  fromObject: function(object) {
    v.require_range(0, 0xFF, object, "uint8 " + object);
    return object;
  },
  toObject: function(object, debug) {
    if (debug == null) {
      debug = {};
    }
    if (debug.use_default && object === void 0) {
      return 0;
    }
    v.require_range(0, 0xFF, object, "uint8 " + object);
    return parseInt(object);
  }
};

Types.uint16 = {
  fromByteBuffer: function(b) {
    return b.readUint16();
  },
  appendByteBuffer: function(b, object) {
    v.require_range(0, 0xFFFF, object, "uint16 " + object);
    b.writeUint16(object);
  },
  fromObject: function(object) {
    v.require_range(0, 0xFFFF, object, "uint16 " + object);
    return object;
  },
  toObject: function(object, debug) {
    if (debug == null) {
      debug = {};
    }
    if (debug.use_default && object === void 0) {
      return 0;
    }
    v.require_range(0, 0xFFFF, object, "uint16 " + object);
    return parseInt(object);
  }
};

Types.uint32 = {
  fromByteBuffer: function(b) {
    return b.readUint32();
  },
  appendByteBuffer: function(b, object) {
    v.require_range(0, 0xFFFFFFFF, object, "uint32 " + object);
    b.writeUint32(object);
  },
  fromObject: function(object) {
    v.require_range(0, 0xFFFFFFFF, object, "uint32 " + object);
    return object;
  },
  toObject: function(object, debug) {
    if (debug == null) {
      debug = {};
    }
    if (debug.use_default && object === void 0) {
      return 0;
    }
    v.require_range(0, 0xFFFFFFFF, object, "uint32 " + object);
    return parseInt(object);
  }
};

var MIN_SIGNED_32 = -1 * Math.pow(2, 31);
var MAX_SIGNED_32 = Math.pow(2, 31) - 1;

Types.varint32 = {
  fromByteBuffer: function(b) {
    return b.readVarint32();
  },
  appendByteBuffer: function(b, object) {
    v.require_range(MIN_SIGNED_32, MAX_SIGNED_32, object, "uint32 " + object);
    b.writeVarint32(object);
  },
  fromObject: function(object) {
    v.require_range(MIN_SIGNED_32, MAX_SIGNED_32, object, "uint32 " + object);
    return object;
  },
  toObject: function(object, debug) {
    if (debug == null) {
      debug = {};
    }
    if (debug.use_default && object === void 0) {
      return 0;
    }
    v.require_range(MIN_SIGNED_32, MAX_SIGNED_32, object, "uint32 " + object);
    return parseInt(object);
  }
};

Types.int64 = {
  fromByteBuffer: function(b) {
    return b.readInt64();
  },
  appendByteBuffer: function(b, object) {
    v.required(object);
    b.writeInt64(v.to_long(object));
  },
  fromObject: function(object) {
    v.required(object);
    return v.to_long(object);
  },
  toObject: function(object, debug) {
    if (debug == null) {
      debug = {};
    }
    if (debug.use_default && object === void 0) {
      return "0";
    }
    v.required(object);
    return v.to_long(object).toString();
  }
};

Types.uint64 = {
  fromByteBuffer: function(b) {
    return b.readUint64();
  },
  appendByteBuffer: function(b, object) {
    b.writeUint64(v.to_long(v.unsigned(object)));
  },
  fromObject: function(object) {
    return v.to_long(v.unsigned(object));
  },
  toObject: function(object, debug) {
    if (debug == null) {
      debug = {};
    }
    if (debug.use_default && object === void 0) {
      return "0";
    }
    return v.to_long(object).toString();
  }
};

Types.string = {
  fromByteBuffer: function(b) {
    var b_copy, len;
    len = b.readVarint32();
    b_copy = b.copy(b.offset, b.offset + len);
    b.skip(len);
    return new Buffer(b_copy.toBinary(), 'binary');
  },
  appendByteBuffer: function(b, object) {
    v.required(object);
    b.writeVarint32(object.length);
    b.append(object.toString('binary'), 'binary');
  },
  fromObject: function(object) {
    v.required(object);
    return new Buffer(object);
  },
  toObject: function(object, debug) {
    if (debug == null) {
      debug = {};
    }
    if (debug.use_default && object === void 0) {
      return "";
    }
    return object.toString();
  }
};

Types.bytes = function(size) {
  return {
    fromByteBuffer: function(b) {
      var b_copy, len;
      if (size === void 0) {
        len = b.readVarint32();
        b_copy = b.copy(b.offset, b.offset + len);
        b.skip(len);
        return new Buffer(b_copy.toBinary(), 'binary');
      } else {
        b_copy = b.copy(b.offset, b.offset + size);
        b.skip(size);
        return new Buffer(b_copy.toBinary(), 'binary');
      }
    },
    appendByteBuffer: function(b, object) {
      v.required(object);
      if (size === void 0) {
        b.writeVarint32(object.length);
      }
      b.append(object.toString('binary'), 'binary');
    },
    fromObject: function(object) {
      v.required(object);
      return new Buffer(object, 'hex');
    },
    toObject: function(object, debug) {
      var zeros;
      if (debug == null) {
        debug = {};
      }
      if (debug.use_default && object === void 0) {
        zeros = function(num) {
          return new Array(num).join("00");
        };
        return zeros(size);
      }
      v.required(object);
      return object.toString('hex');
    }
  };
};

Types.bool = {
  fromByteBuffer: function(b) {
    return b.readUint8();
  },
  appendByteBuffer: function(b, object) {
    b.writeUint8(object ? 1 : 0);
  },
  fromObject: function(object) {
    if (object) {
      return 1;
    } else {
      return 0;
    }
  },
  toObject: function(object, debug) {
    if (debug == null) {
      debug = {};
    }
    if (debug.use_default && object === void 0) {
      return false;
    }
    if (object) {
      return true;
    } else {
      return false;
    }
  }
};

Types["void"] = {
  fromByteBuffer: function(b) {
    throw new Error("(void) undefined type");
  },
  appendByteBuffer: function(b, object) {
    throw new Error("(void) undefined type");
  },
  fromObject: function(object) {
    throw new Error("(void) undefined type");
  },
  toObject: function(object, debug) {
    if (debug == null) {
      debug = {};
    }
    if (debug.use_default && object === void 0) {
      return void 0;
    }
    throw new Error("(void) undefined type");
  }
};

Types.array = function(st_operation) {
  return {
    fromByteBuffer: function(b) {
      var i, j, ref, results, size;
      size = b.readVarint32();
      if (HEX_DUMP) {
        console.log("varint32 size = " + size.toString(16));
      }
      results = [];
      for (i = j = 0, ref = size; j < ref; i = j += 1) {
        results.push(st_operation.fromByteBuffer(b));
      }
      return results;
    },
    appendByteBuffer: function(b, object) {
      var j, len1, o;
      v.required(object);
      b.writeVarint32(object.length);
      for (j = 0, len1 = object.length; j < len1; j++) {
        o = object[j];
        st_operation.appendByteBuffer(b, o);
      }
    },
    fromObject: function(object) {
      var j, len1, o, results;
      v.required(object);
      results = [];
      for (j = 0, len1 = object.length; j < len1; j++) {
        o = object[j];
        results.push(st_operation.fromObject(o));
      }
      return results;
    },
    toObject: function(object, debug) {
      var j, len1, o, results;
      if (debug == null) {
        debug = {};
      }
      if (debug.use_default && object === void 0) {
        return [st_operation.toObject(object, debug)];
      }
      v.required(object);
      results = [];
      for (j = 0, len1 = object.length; j < len1; j++) {
        o = object[j];
        results.push(st_operation.toObject(o, debug));
      }
      return results;
    }
  };
};

Types.time_point_sec = {
  fromByteBuffer: function(b) {
    return b.readUint32();
  },
  appendByteBuffer: function(b, object) {
    b.writeUint32(object);
  },
  fromObject: function(object) {
    v.required(object);
    return Math.round((new Date(object)).getTime() / 1000);
  },
  toObject: function(object, debug) {
    var int;
    if (debug == null) {
      debug = {};
    }
    if (debug.use_default && object === void 0) {
      return (new Date(0)).toISOString().split('.')[0];
    }
    v.required(object);
    int = parseInt(object);
    v.require_range(0, 0xFFFFFFFF, int, "uint32 " + object);
    return (new Date(int * 1000)).toISOString().split('.')[0];
  }
};

Types.set = function(st_operation) {
  return {
    validate: function(array) {
      var dup_map, j, len1, o, ref;
      dup_map = {};
      for (j = 0, len1 = array.length; j < len1; j++) {
        o = array[j];
        if ((ref = typeof o) === 'string' || ref === 'number') {
          if (dup_map[o] !== void 0) {
            throw new Error("duplicate");
          }
          dup_map[o] = true;
        }
      }
      return array.sort(st_operation.compare);
    },
    fromByteBuffer: function(b) {
      var i, size;
      size = b.readVarint32();
      if (HEX_DUMP) {
        console.log("varint32 size = " + size.toString(16));
      }
      return this.validate((function() {
        var j, ref, results;
        results = [];
        for (i = j = 0, ref = size; j < ref; i = j += 1) {
          results.push(st_operation.fromByteBuffer(b));
        }
        return results;
      })());
    },
    appendByteBuffer: function(b, object) {
      var j, len1, o, ref;
      if (!object) {
        object = [];
      }
      b.writeVarint32(object.length);
      ref = this.validate(object);
      for (j = 0, len1 = ref.length; j < len1; j++) {
        o = ref[j];
        st_operation.appendByteBuffer(b, o);
      }
    },
    fromObject: function(object) {
      var o;
      if (!object) {
        object = [];
      }
      return this.validate((function() {
        var j, len1, results;
        results = [];
        for (j = 0, len1 = object.length; j < len1; j++) {
          o = object[j];
          results.push(st_operation.fromObject(o));
        }
        return results;
      })());
    },
    toObject: function(object, debug) {
      var o;
      if (debug == null) {
        debug = {};
      }
      if (debug.use_default && object === void 0) {
        return [st_operation.toObject(object, debug)];
      }
      if (!object) {
        object = [];
      }
      return this.validate((function() {
        var j, len1, results;
        results = [];
        for (j = 0, len1 = object.length; j < len1; j++) {
          o = object[j];
          results.push(st_operation.toObject(o, debug));
        }
        return results;
      })());
    }
  };
};

Types.fixed_array = function(count, st_operation) {
  return {
    fromByteBuffer: function(b) {
      var i, j, ref, results;
      results = [];
      for (i = j = 0, ref = count; j < ref; i = j += 1) {
        results.push(st_operation.fromByteBuffer(b));
      }
      return results;
    },
    appendByteBuffer: function(b, object) {
      var i, j, ref;
      if (count !== 0) {
        v.required(object);
      }
      for (i = j = 0, ref = count; j < ref; i = j += 1) {
        st_operation.appendByteBuffer(b, object[i]);
      }
    },
    fromObject: function(object) {
      var i, j, ref, results;
      if (count !== 0) {
        v.required(object);
      }
      results = [];
      for (i = j = 0, ref = count; j < ref; i = j += 1) {
        results.push(st_operation.fromObject(object[i]));
      }
      return results;
    },
    toObject: function(object, debug) {
      var i, j, k, ref, ref1, results, results1;
      if (debug == null) {
        debug = {};
      }
      if (debug.use_default && object === void 0) {
        results = [];
        for (i = j = 0, ref = count; j < ref; i = j += 1) {
          results.push(st_operation.toObject(void 0, debug));
        }
        return results;
      }
      if (count !== 0) {
        v.required(object);
      }
      results1 = [];
      for (i = k = 0, ref1 = count; k < ref1; i = k += 1) {
        results1.push(st_operation.toObject(object[i], debug));
      }
      return results1;
    }
  };
};


/*
    Supports instance numbers (11) or object types (1.2.11).  Object type validation is enforced when an object type is used.
 */
var id_type = function(reserved_spaces, object_type) {
  v.required(reserved_spaces, "reserved_spaces");
  v.required(object_type, "object_type");
  return {
    fromByteBuffer: function(b) {
      return b.readVarint32();
    },
    appendByteBuffer: function(b, object) {
      v.required(object);
      if (object.resolve !== void 0) {
        object = object.resolve;
      }
      if (/^[0-9]+\.[0-9]+\.[0-9]+$/.test(object)) {
        object = v.get_instance(reserved_spaces, object_type, object);
      }
      b.writeVarint32(object);
    },
    fromObject: function(object) {
      v.required(object);
      if (object.resolve !== void 0) {
        object = object.resolve;
      }
      if (v.is_digits(object)) {
        return v.to_number(object);
      }
      return v.get_instance(reserved_spaces, object_type, object);
    },
    toObject: function(object, debug) {
      var object_type_id;
      if (debug == null) {
        debug = {};
      }
      object_type_id = chain_types.object_type[object_type];
      if (debug.use_default && object === void 0) {
        return reserved_spaces + "." + object_type_id + ".0";
      }
      v.required(object);
      if (object.resolve !== void 0) {
        object = object.resolve;
      }
      if (/^[0-9]+\.[0-9]+\.[0-9]+$/.test(object)) {
        object = v.get_instance(reserved_spaces, object_type, object);
      }
      return (reserved_spaces + "." + object_type_id + ".") + object;
    }
  };
};

Types.protocol_id_type = function(name) {
  return id_type(chain_types.reserved_spaces.protocol_ids, name);
}


Types.object_id_type = {
  fromByteBuffer: function(b) {
    return ObjectId.fromByteBuffer(b);
  },
  appendByteBuffer: function(b, object) {
    v.required(object);
    if (object.resolve !== void 0) {
      object = object.resolve;
    }
    object = ObjectId.fromString(object);
    object.appendByteBuffer(b);
  },
  fromObject: function(object) {
    v.required(object);
    if (object.resolve !== void 0) {
      object = object.resolve;
    }
    return ObjectId.fromString(object);
  },
  toObject: function(object, debug) {
    if (debug == null) {
      debug = {};
    }
    if (debug.use_default && object === void 0) {
      return "0.0.0";
    }
    v.required(object);
    if (object.resolve !== void 0) {
      object = object.resolve;
    }
    object = ObjectId.fromString(object);
    return object.toString();
  }
};

Types.vote_id = {
  TYPE: 0x000000FF,
  ID: 0xFFFFFF00,
  fromByteBuffer: function(b) {
    var value;
    value = b.readUint32();
    return {
      type: value & this.TYPE,
      id: value & this.ID
    };
  },
  appendByteBuffer: function(b, object) {
    var value;
    v.required(object);
    value = object.id << 8 | object.type;
    b.writeUint32(value);
  },
  fromObject: function(object) {
    var id, ref, type;
    v.required(object, "(type vote_id)");
    v.require_test(/^[0-9]+:[0-9]+$/, object, "vote_id format " + object);
    ref = object.split(':'), type = ref[0], id = ref[1];
    v.require_range(0, 0xff, type, "vote type " + object);
    v.require_range(0, 0xffffff, id, "vote id " + object);
    return {
      type: type,
      id: id
    };
  },
  toObject: function(object, debug) {
    if (debug == null) {
      debug = {};
    }
    if (debug.use_default && object === void 0) {
      return "0:0";
    }
    v.required(object);
    return object.type + ":" + object.id;
  },
  compare: function(a, b) {
    return parseInt(a.id) - parseInt(b.id);
  }
};

Types.optional = function(st_operation) {
  v.required(st_operation, "st_operation");
  return {
    fromByteBuffer: function(b) {
      if (b.readUint8() !== 1) {
        return void 0;
      }
      return st_operation.fromByteBuffer(b);
    },
    appendByteBuffer: function(b, object) {
      if (object !== null && object !== void 0) {
        b.writeUint8(1);
        st_operation.appendByteBuffer(b, object);
      } else {
        b.writeUint8(0);
      }
    },
    fromObject: function(object) {
      if (object === void 0) {
        return void 0;
      }
      return st_operation.fromObject(object);
    },
    toObject: function(object, debug) {
      var result_object;
      if (debug == null) {
        debug = {};
      }
      result_object = !debug.use_default && object === void 0 ? void 0 : st_operation.toObject(object, debug);
      if (debug.annotate) {
        if (typeof result_object === "object") {
          result_object.__optional = "parent is optional";
        } else {
          result_object = {
            __optional: result_object
          };
        }
      }
      return result_object;
    }
  };
};

Types.static_variant = function(_st_operations) {
  return {
    st_operations: _st_operations,
    fromByteBuffer: function(b) {
      var st_operation, type_id;
      type_id = b.readVarint32();
      st_operation = this.st_operations[type_id];
      if (HEX_DUMP) {
        console.error("static_variant id 0x" + (type_id.toString(16)) + " (" + type_id + ")");
      }
      v.required(st_operation, "operation " + type_id);
      return [type_id, st_operation.fromByteBuffer(b)];
    },
    appendByteBuffer: function(b, object) {
      var st_operation, type_id;
      v.required(object);
      type_id = object[0];
      st_operation = this.st_operations[type_id];
      v.required(st_operation, "operation " + type_id);
      b.writeVarint32(type_id);
      st_operation.appendByteBuffer(b, object[1]);
    },
    fromObject: function(object) {
      var st_operation, type_id;
      v.required(object);
      type_id = object[0];
      st_operation = this.st_operations[type_id];
      v.required(st_operation, "operation " + type_id);
      return [type_id, st_operation.fromObject(object[1])];
    },
    toObject: function(object, debug) {
      var st_operation, type_id;
      if (debug == null) {
        debug = {};
      }
      if (debug.use_default && object === void 0) {
        return [0, this.st_operations[0].toObject(void 0, debug)];
      }
      v.required(object);
      type_id = object[0];
      st_operation = this.st_operations[type_id];
      v.required(st_operation, "operation " + type_id);
      return [type_id, st_operation.toObject(object[1], debug)];
    }
  };
};

Types.map = function(key_st_operation, value_st_operation) {
  return {
    validate: function(array) {
      var dup_map, j, len1, o, ref;
      if (!Array.isArray(array)) {
        throw new Error("expecting array");
      }
      dup_map = {};
      for (j = 0, len1 = array.length; j < len1; j++) {
        o = array[j];
        if (o.length !== 2) {
          throw new Error("expecting two elements");
        }
        if ((ref = typeof o[0]) === 'number' || ref === 'string') {
          if (dup_map[o[0]] !== void 0) {
            throw new Error("duplicate");
          }
          dup_map[o[0]] = true;
        }
      }
      return array;
    },
    fromByteBuffer: function(b) {
      var i;
      return this.validate((function() {
        var j, ref, results;
        results = [];
        for (i = j = 0, ref = b.readVarint32(); j < ref; i = j += 1) {
          results.push([key_st_operation.fromByteBuffer(b), value_st_operation.fromByteBuffer(b)]);
        }
        return results;
      })());
    },
    appendByteBuffer: function(b, object) {
      var j, len1, o;
      this.validate(object);
      b.writeVarint32(object.length);
      for (j = 0, len1 = object.length; j < len1; j++) {
        o = object[j];
        key_st_operation.appendByteBuffer(b, o[0]);
        value_st_operation.appendByteBuffer(b, o[1]);
      }
    },
    fromObject: function(object) {
      var o;
      v.required(object);
      return this.validate((function() {
        var j, len1, results;
        results = [];
        for (j = 0, len1 = object.length; j < len1; j++) {
          o = object[j];
          results.push([key_st_operation.fromObject(o[0]), value_st_operation.fromObject(o[1])]);
        }
        return results;
      })());
    },
    toObject: function(object, debug) {
      var o;
      if (debug == null) {
        debug = {};
      }
      if (debug.use_default && object === void 0) {
        return [[key_st_operation.toObject(void 0, debug), value_st_operation.toObject(void 0, debug)]];
      }
      v.required(object);
      return this.validate((function() {
        var j, len1, results;
        results = [];
        for (j = 0, len1 = object.length; j < len1; j++) {
          o = object[j];
          results.push([key_st_operation.toObject(o[0], debug), value_st_operation.toObject(o[1], debug)]);
        }
        return results;
      })());
    }
  };
};
