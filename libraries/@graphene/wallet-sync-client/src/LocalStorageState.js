

export default class LocalStorageState {
    
    constructor(namespace) {
        if( ! /a-z0-9_-/i.test( namespace ) throw new Error(
            "@arg {string} namespace unique to each wallet.  Must match /a-z0-9_-/i.")
    }
        