# Setup
## Install
```bash
npm install
```

## Database
```bash
#  Assumes your user is the default root (with no password)
mysqladmin -u root create wallet_server
node src/db/models.js
```

# Commands
See "scripts" in [package.json](./package.json)

Example: `npm start` or `npm run [cli|dev]`

Unit tests are run from [@graphene/wallet-client](../../libraries/@graphene/wallet-client)..

# Configure
Update `./.npmrc` if you need to change something:
```sh
# Server Port
@graphene/wallet-server:network_port = 9080
@graphene/wallet-server:network_ip_requests_per_hour = 100
#
# Email - tokens have the time in them, expire_min is tested when verifying
@graphene/time-token:expire_min = 10
# wallet-server configuration, see ./package.json => { config: {...} }
@graphene/wallet-server:mail_from = alice@examples.com
# Email configuration, see ./bin/email.sh
@graphene/wallet-server:mail_script = ./bin/email.sh
#

```
For more, see "config" in [package.json](./package.json)

