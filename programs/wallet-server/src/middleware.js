export default function createMiddleware() {
    return store => next => action => {
        console.log('Middleware\t', action.type)
        // switch( action.type ) {
        //     case 'requestCode':
        //         break
        // }
        return next(action)
    }
}