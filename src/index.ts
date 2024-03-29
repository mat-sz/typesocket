/**
 * TypeSocket options.
 * @interface
 */
export interface TypeSocketOptions {
  /**
   * Maximum amount of retries until a successful connection gets established.
   * Set to 0 to keep retrying forever.
   * Default: 5
   */
  maxRetries?: number;

  /**
   * When set to true the client will try to reconnect when the socket is intentionally closed by either party.
   * Default: false
   */
  retryOnClose?: boolean;

  /**
   * Time between retries. (ms)
   * Default: 500
   */
  retryTime?: number;
}

type TypeSocketConnectionStateChangeEventListener<T> = (
  this: TypeSocket<T>
) => void;
type TypeSocketMessageEventListener<T> = (
  this: TypeSocket<T>,
  message: T
) => void;
type TypeSocketRawMessageEventListener<T> = (
  this: TypeSocket<T>,
  message: string | ArrayBuffer
) => void;
type TypeSocketBinaryMessageEventListener<T> = (
  this: TypeSocket<T>,
  message: ArrayBuffer
) => void;

interface TypeSocketEvents<T> {
  connected: Set<TypeSocketConnectionStateChangeEventListener<T>>;
  disconnected: Set<TypeSocketConnectionStateChangeEventListener<T>>;
  permanentlyDisconnected: Set<TypeSocketConnectionStateChangeEventListener<T>>;
  message: Set<TypeSocketMessageEventListener<T>>;
  invalidMessage: Set<TypeSocketRawMessageEventListener<T>>;
  rawMessage: Set<TypeSocketRawMessageEventListener<T>>;
  binaryMessage: Set<TypeSocketBinaryMessageEventListener<T>>;
}

export class TypeSocket<T> {
  private socket: WebSocket | null = null;

  private retries = 0;

  private options: TypeSocketOptions = {
    maxRetries: 5,
    retryOnClose: false,
    retryTime: 500,
  };

  private events: TypeSocketEvents<T> = {
    connected: new Set(),
    disconnected: new Set(),
    permanentlyDisconnected: new Set(),
    message: new Set(),
    invalidMessage: new Set(),
    rawMessage: new Set(),
    binaryMessage: new Set(),
  };

  /**
   * Creates a new TypeSocket
   * @param url WebSocket server URL
   */
  constructor(private url: string, options?: TypeSocketOptions) {
    if (options) {
      this.options = {
        ...this.options,
        ...options,
      };
    }
  }

  /**
   * Connects to the server.
   *
   * Will automatically retry on failure.
   */
  connect(): void {
    if (this.socket) {
      try {
        this.socket.close();
        this.disconnected();
      } catch {}
    }

    this.socket = new WebSocket(this.url);
    this.socket.binaryType = 'arraybuffer';

    this.socket.onopen = () => {
      this.connected();
    };

    this.socket.onclose = e => {
      if (e.code === 1000 || (this.options.retryOnClose && this.socket)) {
        this.reconnectAfterTime(this.options.retryTime);
      } else {
        this.disconnected();
        this.permanentlyDisconnected();
      }
    };

    this.socket.onmessage = e => {
      this.message(e.data);
    };

    this.socket.onerror = () => {
      this.disconnected();
      this.socket = null;

      this.reconnectAfterTime(this.options.retryTime);
    };
  }

  /**
   * Disconnects the connection.
   *
   * When called, TypeSocket will stop retrying, the WebSocket will be closed and both disconnected and permanentlyDisconnected events will be called.
   */
  disconnect(): void {
    if (this.socket) {
      try {
        this.socket.onclose = null;
        this.socket.onerror = null;
        this.socket.close();
        this.disconnected();
        this.permanentlyDisconnected();
      } catch {}
    }
  }

  /**
   * Sends a JavaScript object of type T to the server.
   * @param data JS object.
   */
  send(data: T): void {
    if (!this.socket) return;

    this.socket.send(JSON.stringify(data));
  }

  /**
   * Sends raw data over the socket.
   * @param data Raw data.
   */
  sendRaw(data: string | ArrayBuffer | Blob | ArrayBufferView): void {
    if (!this.socket) return;

    this.socket.send(data);
  }

  /**
   * Ready state of the socket.
   */
  get readyState(): number {
    return this.socket ? this.socket.readyState : 0;
  }

  /**
   * Adds a listener for a message event.
   * @param eventType Event type. (message)
   * @param listener Listener function.
   */
  on(eventType: 'message', listener: TypeSocketMessageEventListener<T>): void;

  /**
   * Adds a listener for a raw/invalid message event.
   * @param eventType Event type. (message)
   * @param listener Listener function.
   */
  on(
    eventType: 'rawMessage' | 'invalidMessage',
    listener: TypeSocketRawMessageEventListener<T>
  ): void;

  /**
   * Adds a listener for a connection event.
   * @param eventType Event type. (connected, disconnected, permanentlyDisconnected)
   * @param listener Listener function.
   */
  on(
    eventType: 'connected' | 'disconnected' | 'permanentlyDisconnected',
    listener: TypeSocketConnectionStateChangeEventListener<T>
  ): void;

  /**
   * Adds a listener for a binary message event.
   * @param eventType Event type. (binaryMessage)
   * @param listener Listener function.
   */
  on(
    eventType: 'binaryMessage',
    listener: TypeSocketBinaryMessageEventListener<T>
  ): void;

  /**
   * Adds a listener for a given event.
   * @param eventType Event type.
   * @param listener Listener function.
   */
  on(eventType: keyof TypeSocketEvents<T>, listener: Function): void {
    this.events[eventType].add(listener as any);
  }

  /**
   * Removes a listener for a message event.
   * @param eventType Event type. (message)
   * @param listener Listener function.
   */
  off(eventType: 'message', listener: TypeSocketMessageEventListener<T>): void;

  /**
   * Removes a listener for a raw/invalid message event.
   * @param eventType Event type. (message)
   * @param listener Listener function.
   */
  off(
    eventType: 'rawMessage' | 'invalidMessage',
    listener: TypeSocketRawMessageEventListener<T>
  ): void;

  /**
   * Removes a listener for a connection event.
   * @param eventType Event type. (connected, disconnected, permanentlyDisconnected)
   * @param listener Listener function.
   */
  off(
    eventType: 'connected' | 'disconnected' | 'permanentlyDisconnected',
    listener: TypeSocketConnectionStateChangeEventListener<T>
  ): void;

  /**
   * Removes a listener for a binary message event.
   * @param eventType Event type. (binaryMessage)
   * @param listener Listener function.
   */
  off(
    eventType: 'binaryMessage',
    listener: TypeSocketBinaryMessageEventListener<T>
  ): void;

  /**
   * Removes a listener for a given event.
   * @param eventType Event type.
   * @param listener Listener function.
   */
  off(eventType: keyof TypeSocketEvents<T>, listener: Function): void {
    this.events[eventType].delete(listener as any);
  }

  private emit(eventType: keyof TypeSocketEvents<T>, ...args: any[]) {
    for (const listener of this.events[eventType]) {
      (listener as Function).apply(this, args);
    }
  }

  private reconnectAfterTime(time = 500) {
    if (this.socket) {
      this.socket.close();
    }

    this.socket = null;
    this.disconnected();

    setTimeout(() => {
      this.reconnect();
    }, time);
  }

  private reconnect() {
    this.retries++;

    if (this.options.maxRetries && this.retries > this.options.maxRetries) {
      this.disconnected();
      this.permanentlyDisconnected();
      return;
    }

    this.connect();
  }

  private connected() {
    this.retries = 0;

    this.emit('connected');
  }

  private disconnected() {
    this.emit('disconnected');
  }

  private permanentlyDisconnected() {
    this.emit('permanentlyDisconnected');
  }

  private message(data: string | ArrayBuffer) {
    this.emit('rawMessage', data);

    if (typeof data === 'string') {
      try {
        const json = JSON.parse(data);
        if (json) {
          this.emit('message', json);
          return;
        }
      } catch {}
    } else if (data instanceof ArrayBuffer) {
      this.emit('binaryMessage', data);
    }

    this.emit('invalidMessage', data);
  }
}
