# TypeSocket

TypeScript WebSocket wrapper with disconnection handling and JSON parsing.

Used in [filedrop-web](https://github.com/mat-sz/filedrop-web).

API is not stable yet and may change.

## Example usage

```ts
const socket = new TypeSocket<MessageModel>(url, {
    maxRetries: 10
});

socket.on('connected', () => {
    console.log('connected!');
});

socket.on('message', (message: MessageModel) => {
    console.log(message.type);
});

socket.on('disconnected', () => {
    console.log('disconnected');
});

socket.send({
    type: 'ping',
});

socket.connect();
```

### With Redux:

I use TypeSocket with Redux and Redux-Saga like this:

```ts
export const socketMiddleware = (url: string) => {
    return (store: MiddlewareAPI<any, any>) => {
        const socket = new TypeSocket<MessageModel>(url);
        
        socket.on('connected', () => store.dispatch({ type: ActionType.WS_CONNECTED }));
        socket.on('disconnected', () => store.dispatch({ type: ActionType.WS_DISCONNECTED }));
        socket.on('message', (message) => store.dispatch({ type: ActionType.WS_MESSAGE, value: message }));
        socket.connect();

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
    onRawMessage?: (message: string | ArrayBuffer | Blob | ArrayBufferView) => void;

    on(eventType: 'message', listener: (message: T) => void);
    on(eventType: 'rawMessage', listener: (message: string | ArrayBuffer | Blob | ArrayBufferView) => void);
    on(eventType: 'connected' | 'disconnected' | 'permanentlyDisconnected', listener: () => void);

    off(eventType: 'message', listener: (message: T) => void);
    off(eventType: 'rawMessage', listener: (message: string | ArrayBuffer | Blob | ArrayBufferView) => void);
    off(eventType: 'connected' | 'disconnected' | 'permanentlyDisconnected', listener: () => void);

    constructor(private url: string, options?: TypeSocketOptions);
    connect();
    send(data: T);
    sendRaw(data: string | ArrayBuffer | Blob | ArrayBufferView);
    get readyState();
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

A property that contains a function that will get called when a valid message is received.

### onRawMessage

A property that contains a function that will get called when any message is received.