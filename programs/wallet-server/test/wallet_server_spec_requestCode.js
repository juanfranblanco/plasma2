import assert from "assert"
import fetch from "node-fetch"
import replApi from "../src/ReplApi"

const port = process.env.npm_package_config_rest_port

describe('Email service', () => {

    before( done =>{ replApi.start(done) })
    
    it('requestCode', ()=> {
        fetch("http://localhost:"+port+ "/requestCode?email=alice@example.bitbucket")
            .then( res => {
                assert.equal(true, res.ok)
                assert.equal(200, res.status)
                assert.equal("OK", res.statusText)
                // done() // todo increase timeout
            }).catch( error =>{ console.error(error, error.stack) })
    })
    
})