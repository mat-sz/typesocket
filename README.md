<h1 align="center">TypeSocket</h1>

<p align="center">
TypeScript WebSocket wrapper with disconnection handling and JSON parsing.
</p>

<p align="center">
<img alt="workflow" src="https://img.shields.io/github/workflow/status/mat-sz/typesocket/Node.js%20CI%20(yarn)">
<a href="https://npmjs.com/package/typesocket">
<img alt="npm" src="https://img.shields.io/npm/v/typesocket">
<img alt="npm" src="https://img.shields.io/npm/dw/typesocket">
<img alt="NPM" src="https://img.shields.io/npm/l/typesocket">
</a>
</p>

> **Are you a React.js user?** You might be interested in the [useTypeSocket](https://github.com/mat-sz/use-typesocket) React hook.

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
  maxRetries: 10,
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

    socket.on('connected', () =>
      store.dispatch({ type: ActionType.WS_CONNECTED })
    );
    socket.on('disconnected', () =>
      store.dispatch({ type: ActionType.WS_DISCONNECTED })
    );
    socket.on('message', message =>
      store.dispatch({ type: ActionType.WS_MESSAGE, value: message })
    );
    socket.connect();

    return (next: (action: any) => void) => (action: any) => {
      if (
        action.type &&
        action.type === ActionType.WS_SEND_MESSAGE &&
        socket.readyState === 1
      ) {
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
socket.on('message', message => {
  console.log(message);
});
```

### connected

Emitted when a connection gets established.

### disconnected

Emitted when the socket is disconnected.

### permanentlyDisconnected

Emitted when the socket is permanently disconnected, for example:

- Server gracefully closes the connection.
- Client gracefully closes the connection.
- `disconnect` is called.
- Retry amount has been exceeded.

### message

Emitted when a **valid** message is received.

The only argument contains an object of type `T` with a deserialized message.

### invalidMessage

Emitted when an **invalid** message is received.

The only argument contains an object of type `string | ArrayBuffer` with a raw message.

### rawMessage

Emitted when **any** message is received.

The only argument contains an object of type `string | ArrayBuffer` with a raw message.

### binaryMessage

Emitted when a binary message (with an ArrayBuffer) is received.

The only argument contains an object of type `ArrayBuffer`.

## API

```
on(eventType: 'message', listener: (message: T) => void);
on(eventType: 'rawMessage' | 'invalidMessage', listener: (message: string | ArrayBuffer) => void);
on(eventType: 'binaryMessage', listener: (message: ArrayBuffer) => void);
on(eventType: 'connected' | 'disconnected' | 'permanentlyDisconnected', listener: () => void);

off(eventType: 'message', listener: (message: T) => void);
off(eventType: 'rawMessage' | 'invalidMessage', listener: (message: string | ArrayBuffer) => void);
on(eventType: 'binaryMessage', listener: (message: ArrayBuffer) => void);
off(eventType: 'connected' | 'disconnected' | 'permanentlyDisconnected', listener: () => void);

constructor(private url: string, options?: TypeSocketOptions);
connect();
disconnect();
send(data: T);
sendRaw(data: string | ArrayBuffer | Blob | ArrayBufferView);
get readyState();
```
