import createServer from "./src/server"
try {
    createServer()
} catch(error) {
    console.error("ERROR\tcreate server\t", error, 'stack', error.stack)
}