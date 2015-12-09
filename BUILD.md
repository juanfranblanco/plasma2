
# Libraries
```bash
npm install
NODE_PATH="$(pwd)/node_modules:$(pwd)/libraries"
PATH="$(pwd)/node_modules/.bin:$PATH"
```

# Programs
```bash
# see README.md
cd programs/wallet-server
```

# ESDoc (beta)
```bash
npm i -g esdoc esdoc-es7-plugin
esdoc -c ./esdoc.json
open out/esdoc/index.html
```
