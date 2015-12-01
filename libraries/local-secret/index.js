import crypto from "crypto"

const { npm_config__graphene_local_secret_secret } = process.env

if( ! npm_config__graphene_local_secret_secret ) {
    const buf = crypto.randomBytes(256)
    const local_secret = buf.toString('base64')
    console.error("# WARN you need to run this command to lock-in your gph_local_secret:")
    console.error("npm config set @graphene/local-secret:secret '%s'", local_secret)
    process.env.npm_config__graphene_local_secret_secret = local_secret
    console.error()
}

export default process.env.npm_config__graphene_local_secret_secret
