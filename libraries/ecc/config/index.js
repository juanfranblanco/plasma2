/**
# Configure
Run these if you need to change something.
```bash
npm config set @graphene/ecc:default_address_prefix GPH
```
*/
module.exports = {
    address_prefix: process.env.npm_config__graphene_ecc_default_address_prefix || "GPH"
}