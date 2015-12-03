/**
# Configure
Create `./.npmrc` if you need to change something:
```bash
@graphene/ecc:default_address_prefix = GPH
```
*/
module.exports = {
    address_prefix: process.env.npm_config__graphene_ecc_default_address_prefix || "GPH"
}