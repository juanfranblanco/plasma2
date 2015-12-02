
# Run these if you need to change something (for more, see ./package.json)
```bash
# Server Port
npm config set @graphene/wallet-server:rest_port 9080
npm config set @graphene/wallet-server:rest_ip_requests_per_hour 10

# Email - tokens have the time in them, expire_min is tested when verifying
npm config set @graphene/time-token:expire_min 10
# wallet-server configuration ./package.json => { config }
npm config set @graphene/wallet-server:mail_from alice@examples.com
# Email configuration ./bin/email.sh
npm config set @graphene/wallet-server:mail_script ./bin/email.sh

# See https://www.npmjs.com/package/busboy and @graphene/rest-api package
npm config set @graphene/rest-api:fields 1024
npm config set @graphene/rest-api:fieldSize $((20 * 1024))
npm config set @graphene/rest-api:files 10
npm config set @graphene/rest-api:fileSize $((1000 * 1024))
```

# Setup the database

## MySQL (work in progress)
```bash
sudo apt-get install mysql-server
# https://github.com/balderdashy/sails-mysql
npm install sails-mysql
#npm config set @graphene/wallet-server:
```

## In-Memory
npm install waterline sails-memory