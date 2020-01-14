# TypeSocket

TypeScript WebSocket wrapper with disconnection handling and JSON parsing.

Used in [filedrop-web](https://github.com/mat-sz/filedrop-web).

API is not stable yet and may change. One thing that will be added later is better event handling.

## Example usage

I use TypeSocket with Redux and Redux-Saga like this:

```ts
export const socketMiddleware = (url: string) => {
    return (store: MiddlewareAPI<any, any>) => {
        const socket = new TypeSocket<MessageModel>(url);
        
        socket.onConnected = () => store.dispatch({ type: ActionType.WS_CONNECTED });
        socket.onDisconnected = () => store.dispatch({ type: ActionType.WS_DISCONNECTED });
        socket.onMessage = (message) => store.dispatch({ type: ActionType.WS_MESSAGE, value: message });

        return (next: (action: any) => void) => (action: any) => {
            if (action.type && action.type === ActionType.WS_SEND_MESSAGE && socket.readyState === 1) {
                socket.send(action.value);
            }
            
            return next(action);
        };
    };
};
```

## API

```
    onConnected?: () => void;
    onDisconnected?: () => void;
    onPermanentlyDisconnected?: () => void;
    onMessage?: (message: T) => void;

    constructor(private url: string)
    connect()
    send(data: T)
    get readyState()
```

### onConnected

A property that contains a function that will get called when a connection gets established.

### onDisconnected

A property that contains a function that will get called when the socket is disconnected.

### onPermanentlyDisconnected

A property that contains a function that will get called when the socket is permanently disconnected, that is:

* Server gracefully closes the connection.
* Client gracefully closes the connection.
* Retry amount has been exceeded.

### onMessage

A property that contains a function that will get called when a message is received.