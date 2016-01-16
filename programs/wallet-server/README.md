# Setup
## Install
```bash
npm install
```

# Create Database
```bash
#  Assumes your user is the default root (with no password)
mysqladmin -u root create wallet_server
node src/db/models.js
```

# Run
`npm start`

# Configuration
The first time you start the server it will create a random `@graphene/local-secret:secret` value and instruct you to save this value in your local `./.npmrc` file.  This is used to validate the codes (tokens) sent to the user's email.

If your contributing to this code-base, the unit tests in `@graphene/wallet-client` require the same secret value. 

Update `./.npmrc` with anything you need to change.  These properties have default values in `./package.json` as follows:
```sh
# Server Port
@graphene/wallet-server:network_port = 9080
@graphene/wallet-server:network_ip_requests_per_hour = 100

# MySQL
@graphene/wallet-server:mysql_database = wallet_server
@graphene/wallet-server:mysql_user = root
@graphene/wallet-server:mysql_password
@graphene/wallet-server:mysql_host = localhost
@graphene/wallet-server:mysql_port = 3306

# Email - tokens have the time in them, expire_min is tested when verifying
@graphene/time-token:expire_min = 10
@graphene/wallet-server:mail_from = alice@examples.com
@graphene/wallet-server:mail_script = ./bin/email.sh

# debug
# Show SQL statements.
@graphene/wallet-server:log_info  = true
@graphene/wallet-server:log_debug  = false
@graphene/wallet-server:sql_debug  = false
```
See "config" in [package.json](./package.json)

# Running for Developers
If contributing, the `dev` script will monitor and hot load code changes.  
 
`npm run dev`

There is a `npm run cli` script that is geared towards running commands in the server's environment.

Unit tests are run from [@graphene/wallet-client](../../libraries/@graphene/wallet-client)..
See "scripts" in [package.json](./package.json)
