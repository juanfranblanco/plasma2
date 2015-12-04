# Setup
Visit each library below and see BUILD.md

Make a link to the libraries (so changes in the library are seen without needing to publish)
```bash
npm link ../../libraries/time-token
npm link ../../libraries/rest-api
npm link ../../libraries/ecc
npm link ../../libraries/hash
```

Install
```bash
npm i
```

# Database
```bash
#  Assumes your user is the default root (with no password)
mysqladmin -u root create wallet_server
node run src/db/models.js
```

# Commands
See "scripts" in [package.json](./package.json)
Basically this are `npm start` or `npm run [dev|test|test:watch]`

# Configure
Update `./.npmrc` if you need to change something:
```sh
# Server Port
@graphene/wallet-server:rest_port = 9080
@graphene/wallet-server:rest_ip_requests_per_hour = 10
#
# Email - tokens have the time in them, expire_min is tested when verifying
@graphene/time-token:expire_min = 10
# wallet-server configuration, see ./package.json => { config: {...} }
@graphene/wallet-server:mail_from = alice@examples.com
# Email configuration, see ./bin/email.sh
@graphene/wallet-server:mail_script = ./bin/email.sh
#
# See https://www.npmjs.com/package/busboy and @graphene/rest-api package
@graphene/rest-api:fields = 1024
@graphene/rest-api:fieldSize = 20480
@graphene/rest-api:files = 10
@graphene/rest-api:fileSize = 1024000
```
For more, see "config" in [package.json](./package.json)

