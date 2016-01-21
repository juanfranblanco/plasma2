/**
    Provides @graphene/serializer compatiable types for this package.
    
    Because @graphene/serializer is not a required dependency of this package, this file is not exported in ./index.js and should instead be sourced directy.
*/
// import { Serializer, types } from "@graphene/serializer"
// import { public_key, address } from "./serializer_types"
// 
// let { uint32, uint16, map, protocol_id_type } = types
// 
// export var authority = new Serializer( "authority", {
//     weight_threshold: uint32,
//     account_auths: map (protocol_id_type( "account"), uint16),
//     key_auths: map (public_key, uint16),
//     address_auths: map (address, uint16)
// })
