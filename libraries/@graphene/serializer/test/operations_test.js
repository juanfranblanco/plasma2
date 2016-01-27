import { fromJS } from "immutable"
import { PrivateKey, PublicKey } from "@graphene/ecc"
import { Long } from "bytebuffer"
var assert = require('assert');
var Serilizer = require("../src/serializer")
var types = require('../src/types');

var {
    //id_type,
    //varint32,
    uint8, uint16, uint32, int64, uint64,
    string, bytes, bool, array, fixed_array,
    protocol_id_type, object_id_type, vote_id,
    future_extensions,
    static_variant, map, set,
    public_key, address,
    time_point_sec,
    optional,
} = types

// Must stay in sync with allTypes below.
let AllTypes = new Serilizer("all_types", {
    uint8, uint16, uint32, int64, uint64,
    
    string, bytes: bytes(1), bool, array: array(uint8), fixed_array: fixed_array(2, uint8),
    
    public_key
})

// Serializable types only.  Must stay in sync with AllTypes above.
let allTypes = {
    
    uint8: Math.pow(2,8)-1,
    uint16: Math.pow(2,16)-1,
    uint32: Math.pow(2,32)-1,
    int64: "9223372036854775807",
    uint64: "9223372036854775807",
    
    string: "test",
    bytes: "ff",
    bool: true,
    array: [2, 1],
    fixed_array: [1, 0],
    
    public_key: PrivateKey.fromSeed("").toPublicKey().toString()
}

describe("operations", function() {
    
    describe("all types", ()=> {
        
        let { toObject, fromObject, toBuffer, fromBuffer } = AllTypes
        
        toObject = toObject.bind(AllTypes)
        fromObject = fromObject.bind(AllTypes)
        toBuffer = toBuffer.bind(AllTypes)
        fromBuffer = fromBuffer.bind(AllTypes)
        
        it("from object", ()=> {
            assert(fromObject(allTypes), "serializable" )
            assert(fromObject(fromObject(allTypes)), "non-serializable")
        })
        
        it("to object", ()=> {
            assert.deepEqual(toObject(allTypes), allTypes, "serializable" )
            assert.deepEqual(toObject(toObject(allTypes)), allTypes, "serializable (double to)" )
            assert.deepEqual(toObject(fromObject(allTypes)), allTypes, "non-serializable" )
            assert.deepEqual(toObject(fromObject(fromObject(allTypes))), allTypes, "non-serializable (double from)")
        })
        
        it("to buffer", ()=>{
            assert(toBuffer(allTypes), "serializable" )
            assert(toBuffer(fromObject(allTypes)), "non-serializable")
            assert.equal(
                toBuffer( allTypes ).toString("hex"), // serializable
                toBuffer( fromObject( allTypes )).toString("hex"), // non-serializable
                "serializable and non-serializable"
            )
        })
        
        it("from buffer", ()=> {
            assert.deepEqual(toObject(fromBuffer(toBuffer(allTypes))), allTypes, "serializable" )
            assert.deepEqual(toObject(fromBuffer(toBuffer(fromObject(allTypes)))), allTypes, "non-serializable" )
        })
        
        it("visual check", ()=> {
            console.log(toObject(fromObject(allTypes)))
        })
    }) 
})