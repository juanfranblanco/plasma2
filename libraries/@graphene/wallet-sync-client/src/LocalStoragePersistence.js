
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
        this.SAVE_TO_DISK = key + "::saveToDisk"
        this.saveToDisk = localStorage.getItem(this.SAVE_TO_DISK) === "true"
        let stateStr = localStorage.getItem(this.STATE)
        this.state = stateStr ? Map(JSON.parse(stateStr)) : Map()
    }
    
    /**
        @arg {boolean} [save = true] - Save (or delete / do not save) all state changes to disk
    */
    saveToDisk( save = true ) {
        if( save ) {
            localStorage.setItem(this.SAVE_TO_DISK, "true")
            localStorage.setItem(this.STATE, JSON.stringify(this.state.toJS(),null,0))
        } else {
            localStorage.setItem(this.SAVE_TO_DISK, "false")
            localStorage.removeItem(this.STATE)
        }
        this.saveToDisk = save
    }
    
    /**
        @return {function} state - Accepts Immutable object state updates, merges with existing state, stores this new state and returns a new complete state object.
    */
    setState(newState) {
        this.state = this.state.merge(newState)
        if( this.saveToDisk && newState != undefined )
            localStorage.setItem(this.STATE, JSON.stringify(this.state.toJS(),null,0))
    }
    
    getState() {
        return this.state
    }
    
    /**
        Ensures that memory and persistent storage is cleared.  This does not reset the saveToDisk configuration.
    */
    clear() {
        localStorage.removeItem(this.STATE)
        this.state = Map()
    }
    
}