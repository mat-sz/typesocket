# TypeSocket

TypeScript WebSocket wrapper with disconnection handling and JSON parsing.

Used in [filedrop-web](https://github.com/mat-sz/filedrop-web) and [whiteboard-web](https://github.com/mat-sz/whiteboard-web).

API is **mostly** stable. It may change in the future, but the changes shouldn't be breaking.

## Installation

TypeSocket is available on [npm](https://www.npmjs.com/package/typesocket), you can install it with either npm or yarn:

```sh
npm install typesocket
# or:
yarn install typesocket
```

## Example usage

```ts
const socket = new TypeSocket<MessageModel>(url, {
    maxRetries: 10
});

socket.on('connected', () => {
    console.log('connected!');

    socket.send({
        type: 'ping',
    });
});

socket.on('message', (message: MessageModel) => {
    console.log(message.type);
});

socket.on('disconnected', () => {
    console.log('disconnected');
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

## Events

You can attach event listeners to an instance of `TypeSocket` with `.on`:

```ts
socket.on('message', (message) => {
    console.log(message);
});
```

### connected

Emitted when a connection gets established.

### disconnected

Emitted when the socket is disconnected.

### permanentlyDisconnected

Emitted when the socket is permanently disconnected, for example:

* Server gracefully closes the connection.
* Client gracefully closes the connection.
* `disconnect` is called.
* Retry amount has been exceeded.

### message

Emitted when a **valid** message is received.

The only argument contains an object of type `T` with a deserialized message.

### invalidMessage

Emitted when an **invalid** message is received.

The only argument contains an object of type `string | ArrayBuffer | Blob | ArrayBufferView` with a raw message.

### rawMessage

Emitted when **any** message is received.

The only argument contains an object of type `string | ArrayBuffer | Blob | ArrayBufferView` with a raw message.

## API

```
onConnected?: () => void;
onDisconnected?: () => void;
onPermanentlyDisconnected?: () => void;
onMessage?: (message: T) => void;
onInvalidMessage?: (message: string | ArrayBuffer | Blob | ArrayBufferView) => void;
onRawMessage?: (message: string | ArrayBuffer | Blob | ArrayBufferView) => void;

on(eventType: 'message', listener: (message: T) => void);
on(eventType: 'rawMessage' | 'invalidMessage', listener: (message: string | ArrayBuffer | Blob | ArrayBufferView) => void);
on(eventType: 'connected' | 'disconnected' | 'permanentlyDisconnected', listener: () => void);

off(eventType: 'message', listener: (message: T) => void);
off(eventType: 'rawMessage' | 'invalidMessage', listener: (message: string | ArrayBuffer | Blob | ArrayBufferView) => void);
off(eventType: 'connected' | 'disconnected' | 'permanentlyDisconnected', listener: () => void);

constructor(private url: string, options?: TypeSocketOptions);
connect();
disconnect();
send(data: T);
sendRaw(data: string | ArrayBuffer | Blob | ArrayBufferView);
get readyState();
```