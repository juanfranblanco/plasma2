import replApi from "../src/ReplApi"

/** Run the server and command-line interface in hot-deploy mode. */
describe('wallet server', () => {
    it('run_server', done => {
        replApi.cli()
        done()
    })
})