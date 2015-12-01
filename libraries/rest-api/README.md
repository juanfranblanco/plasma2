# Express JS REST to API middleware.
```js
import * as restApi from "@graphene/rest-api"
import express from 'express'

var api = {
    apiCall_1: function({ param1, param2, filename }) {
        return { type: "API_CALL_1", param1, param2, filename }
    },
    apiCall_2: function({ param }) {
        return { type: "API_CALL_2", param }
    }
}

var dispatch = action => {
    if(action.type === "API_CALL_1")
        // Return the HTTP STATUS "OK"
        action.rest_api.ok()
    else if(action.type === "API_CALL_2")
        // Return the HTTP STATUS "..." (must be a valid HTTP status name string)
        action.rest_api.response("See Other", {message: "Deprecated, see API_CALL_1"})
}

var app = express()
app.get("/:methodName", restApi.get(api, dispatch))
app.post("/:methodName", restApi.post(api, dispatch))
```

# GET Request
```bash
curl http://localhost:9080/apiCall_1?param1=1111&param2=2222
```

# POST Request
```bash
# Post requests are almost identical.  Instead of `restApi.get` use `restApi.post`.  The curl
# command might look like this:
curl -X POST -F "fileupload=@myfile.bin;filename=myfile" -F param1=1111 -F param2=2222 http://localhost:9080/apiCall_1
```

# Reference
```bash
# For valid `action.rest_api.response(string, ...)` strings see:
node -p "require('http').STATUS_CODES"
```
