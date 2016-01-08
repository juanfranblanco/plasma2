import types from "./types"
import Serializer from "./serializer"

var { bytes, optional, int64, uint32, protocol_id_type } = types

export var asset = new Serializer( "asset", {
    amount: int64,
    asset_id: protocol_id_type("asset")
})
