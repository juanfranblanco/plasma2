
import { Map } from "immutable"

export default class LocalStorageState {
    
    /**
        @arg {string} namespace unique to each wallet.  Must contain only letters numbers a understore or dash.
    */
    constructor(namespace) {
        if( ! /[a-z0-9_-]+/i.test( namespace )) throw new TypeError(
            "@arg {string} namespace unique to each wallet.  Must match /[a-z0-9_-]+/i.")
        this.namespace = namespace
        this.state = Map()
    }
    
    reducer() { return this.setState.bind(this) }
    
    setState(state) {
        if( state === undefined) {
            let str = localStorage.getItem("LocalStorageState::" + this.namespace)
            if( ! str ) return this.state
            return this.state = Map(JSON.parse(str))
        }
        this.state = this.state.merge(state)
        localStorage.setItem("LocalStorageState::" + this.namespace, JSON.stringify(this.state.toJS()))
        return this.state
    }
    
    clear() { localStorage.removeItem("LocalStorageState::" + this.namespace) }
    
}    