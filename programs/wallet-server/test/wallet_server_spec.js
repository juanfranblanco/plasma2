// import {expect} from 'chai'
// import { List, Map, fromJS } from 'immutable'
// import { requestCode } from '../src/WalletSyncApi'
// import reducer from "../src/reducer"
// 
// describe('wallet server', () => {
// 
//     describe('requestCode', () => {
//         it('adds to email queue', () => {
//             const state = Map()
//             const nextState = requestCode(state, { email: "alice@example.com" })
//             expect(nextState).to.equal(fromJS({
//                 requestCode: [ "alice@example.com" ]
//             }))
//         })
//         it('adds to email queue via action', () => {
//             const state = Map()
//             const action = {type: 'requestCode', email: "jan@example.com"}
//             const nextState = reducer(state, action)
//             expect(nextState).to.equal(fromJS({
//                 requestCode: [ "jan@example.com" ]
//             }))
//         })
//     })
// })
