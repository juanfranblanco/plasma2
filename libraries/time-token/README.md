Generate server-side token (with optional payload) which may be emailed or QR encoded then verified on the server.  Tokens can be expired.

```js
import {createToken, checkToken} from "@graphene/time-token"`
```

# Configure
Create `./.npmrc` if you need to change something:
```sh
@graphene/time-token:expire_min = 10
```

* [Build](BUILD.md)