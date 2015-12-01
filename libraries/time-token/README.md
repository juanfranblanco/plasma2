Similar to a RSA token in how it is authenticated, however, this token is much larger would require a automated entry like a hyper link or a QR code.  The token may contain a data payload.

Upon checking the token a timeout can be enforced.  Emailed tokens have the time in them, expire_min tested when verifying.  The default is 10 minutes.

A token with data is basically stateless so it may not be necessary to store in a database it until the user returns it and it validates.  The validation must be done server-side where brute-force API protection should be implemented.  The token uses 10 byte token for validation giving odds of guessing 10^24 (1e+24).

This is a binary token, most likely you will need to apply your own encoding.  A base 58 encoded token is about 30 characters long with no data, but with an email address is about 50 characters long.
> 89dipACBipnwFLPXa9JL5ducZAYpG5cWTHdbQFZZLN7e

# Install
```bash
~/your-project
$ npm link ~/graphene/libraries/time-token
```

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

