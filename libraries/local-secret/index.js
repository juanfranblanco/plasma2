import crypto from "crypto"

const { npm_config__graphene_local_secret_secret } = process.env

if( ! npm_config__graphene_local_secret_secret ) {
    const buf = crypto.randomBytes(256)
    const local_secret = buf.toString('base64')
    console.error("# WARN you need to run this command to lock-in your secret."
    console.error("# Alternatively you could add @graphene/local-secret:secret = xxxxx to ./.npmrc")
    console.error("npm config set @graphene/local-secret:secret '%s'", local_secret)
    console.error()
    process.env.npm_config__graphene_local_secret_secret = local_secret
}

export default process.env.npm_config__graphene_local_secret_secret
