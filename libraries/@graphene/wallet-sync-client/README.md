# Setup
```bash
npm install
```

# Configure
For the unit tests, you will need to `npm start` a programs/wallet-server configured with the same secret (@graphene/local-secret:secret = 'test').
```sh
# Sample ./.npmrc
@graphene/wallet-sync-client:rest_port = 9080
@graphene/wallet-sync-client:rest_server = localhost
@graphene/local-secret:secret = 'test'
```

# API Usage
* [Server API](./src/WalletSyncApi.js)
* [test](./test)

# Commands
Example: `npm run [test|test:watch]`
