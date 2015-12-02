import createServer from "../src/server"
import * as WaterlineDb from "../src/WaterlineDb"
import replApi from "../src/ReplApi"

/** This is a hack to start the server in development mode.  More work is needed. */
describe('wallet server', () => {
    it('run_server', done => {
        replApi.start(()=>{ done() })
        // if( global.running_server ) {
        //     global.running_server.close(()=>{ 
        //         let { server } = createServer()
        //         global.running_server = server
        //         WaterlineDb.close( ()=>{ done() })
        //     })
        // } else {
        //     let { server } = createServer()
        //     global.running_server = server
        //     done()
        // }
    })
})