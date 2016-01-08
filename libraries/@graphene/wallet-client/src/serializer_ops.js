import ser from "@graphene/serializer"
import { Serializer } from "@graphene/serializer"
import { public_key } from "@graphene/ecc/serializer_types"

var { asset, authority } = ser.operations
var { bytes, optional, int64, uint32, protocol_id_type } = ser.types

var stealth_memo_data = new Serializer( "stealth_memo_data", {
    from: optional( public_key ),
    amount: asset,
    blinding_factor: bytes(32),
    commitment: bytes(33),
    check: uint32
})

export var stealth_confirmation = new Serializer( "stealth_confirmation", {
    one_time_key: public_key,
    to: optional( public_key ),
    encrypted_memo: stealth_memo_data
})