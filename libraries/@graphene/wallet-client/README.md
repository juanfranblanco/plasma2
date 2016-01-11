# Setup
```bash
npm install
```

# Configure
For the unit tests, you will need to `npm start` a programs/wallet-server configured with the same secret (@graphene/local-secret:secret = 'test').
```sh
# Sample ./.npmrc
@graphene/wallet-client:remote_url = ws://localhost:9080/wallet_v1
@graphene/local-secret:secret = 'test'
```

# API Usage
* [Server API](./src/WalletApi.js)
* [Usage (unit test)](./test)

# Commands
Example: `npm run [test|test:watch]`
