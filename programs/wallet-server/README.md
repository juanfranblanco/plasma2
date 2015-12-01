
# Run these if you need to change something (for more, see ./package.json)
```bash
npm config set @graphene/wallet-server:rest_port 9080
npm config set @graphene/wallet-server:mail_from alice@examples.com
npm config set @graphene/wallet-server:rest_ip_requests_per_hour 10

# Emailed tokens have the time in them, expire_min is tested when verifying
npm config set @graphene/time-token:expire_min 10

# See https://www.npmjs.com/package/busboy
npm config set @graphene/rest-api:fields 1024
npm config set @graphene/rest-api:fieldSize $((20 * 1024))
npm config set @graphene/rest-api:files 10
npm config set @graphene/rest-api:fileSize $((1000 * 1024))
```

