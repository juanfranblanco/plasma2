
import { Map } from "immutable"

/**
    By default, this will use the W3C `localStorage` global object to persist all state updates.  History is not maintained.  Storage may be enabled or disabled at anytime.
*/
export default class LocalStoragePersistence {
    
    /**
        @arg {string} namespace unique to each object store.  Must contain only letters numbers a understore or dash.
    */
    constructor(namespace) {
        if( ! /[a-z0-9_-]+/i.test( namespace )) throw new TypeError(
            "@arg {string} namespace unique to each wallet.  Must match /[a-z0-9_-]+/i.")
        const key = "LocalStoragePersistence::" + this.namespace
        this.STATE = key + "::state"
        this.KEEP_LOCAL_COPY = key + "::keepLocalCopy"
        this.keepLocalCopy = localStorage.getItem(this.KEEP_LOCAL_COPY) === "true"
        this.state = Map()
    }
    
    /**
        @arg {boolean} [save = true] - Save (or delete / do not save) all state changes to disk
    */
    keepLocalCopy( save = true ) {
        if( save ) {
            localStorage.setItem(this.KEEP_LOCAL_COPY, "true")
            localStorage.setItem(this.STATE, JSON.stringify(this.state.toJS(),null,0))
        } else {
            localStorage.setItem(this.KEEP_LOCAL_COPY, "false")
            localStorage.removeItem(this.STATE)
        }
        this.keepLocalCopy = save
    }
    
    /**
        @return {function} - accepts Immutable object state updates, merges with existing state, stores this new state and returns a new complete state object.  When called with no parameters, persisted state is loaded and returned (async storage will need to prepare this in advance). 
    */
    persister() {
        return setState.bind(this)
    }
    
    /**
        Ensures that memory and persistent storage is cleared.
    */
    clear() {
        localStorage.removeItem(this.STATE)
        this.state = Map()
    }
    
}

/**
    @private see {@link this.persister}
*/
setState(state) {
    if( state === undefined ) {
        if( ! this.keepLocalCopy ) return
        let str = localStorage.getItem(this.STATE)
        if( ! str ) return
        return this.state = Map(JSON.parse(str))
    }
    this.state = this.state.merge(state)
    if( this.keepLocalCopy )
        localStorage.setItem(this.STATE, JSON.stringify(this.state.toJS(),null,0))
    
    return this.state
}