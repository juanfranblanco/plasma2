import types from "./types"
import Serializer from "./serializer"

var {
    bytes, optional, uint16, int64, uint32, protocol_id_type, map,
    public_key, address
} = types

// import ops from "@graphene/serializer/ops"
// import { Serializer } from "@graphene/serializer"
// import { public_key } from "@graphene/ecc/src/serializer_types"
// 
// var { asset, authority } = ser.operations
// var { bytes, optional, int64, uint32, protocol_id_type } = ser.types
export var asset = new Serializer( "asset", {
    amount: int64,
    asset_id: protocol_id_type("asset")
})

export var authority = new Serializer( "authority", {
    weight_threshold: uint32,
    account_auths: map (protocol_id_type( "account"), uint16),
    key_auths: map (public_key, uint16),
    address_auths: map (address, uint16)
})


export var stealth_memo_data = new Serializer(
    "stealth_memo_data", {
    from: optional( public_key ),
    amount: asset,
    blinding_factor: bytes(32),
    commitment: bytes(33),
    check: uint32
})

export var stealth_confirmation = new Serializer(
    "stealth_confirmation", {
    one_time_key: public_key,
    to: optional( public_key ),
    encrypted_memo: stealth_memo_data
})


// export var transfer_from_blind = new Serializer( "transfer_from_blind", {
//     amount: asset,
//     to: protocol_id_type("account"),
//     blinding_factor: bytes(32),
//     inputs: array blind_input
// })