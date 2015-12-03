
# Configure
Create ./.npmrc if you need to change something:
>./.npmrc
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
For more, see [package.json](./package.json)

## Database

### MySQL (work in progress)
```bash
sudo apt-get install mysql-server
# https://github.com/balderdashy/sails-mysql
npm install sails-mysql
#npm config set @graphene/wallet-server:
```

### In-Memory
```bash
npm install waterline sails-memory
```
