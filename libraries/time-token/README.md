Like a RSA token but may contain a data pay-load.  Upon checking the token a timeout
can be enforced.  The default is 10 minutes.  A token with data is stateless.  The validation
must be done server-side where brute-force API protection should be implemented.  The token
uses 10 byte token for validation giving odds of guessing 10^24 (1e+24).

This is a binary token, most likely you will need to apply your own encoding.

A base 58 encoded token is about 30 characters long, with an email address
is about 50 characters long.

# Install
TODO: npm i @graphene/time-token

# Usage
```javascript
import {createToken, checkToken} from '@graphene/time-token'

let token = createToken("seed")
assert.equal(19, token.length)

let result = checkToken(token)
assert.equal(true, result.valid)
assert.equal("seed", result.seed)
assert.equal(null, result.error)
```
