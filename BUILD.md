
# Libraries
```bash
npm install
NODE_PATH="$(pwd)/node_modules:$(pwd)/libraries"
PATH="$(pwd)/node_modules/.bin:$PATH"
```

# Programs
```bash
cd programs/wallet-server
npm install
# see "scripts" in ./package.json
```

# ESDoc (beta)
```bash
npm i -g esdoc esdoc-es7-plugin
esdoc -c ./esdoc.json
open out/esdoc/index.html
```
