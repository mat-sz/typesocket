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
    maxRetries?: number,
    
    /**
     * When set to true the client will try to reconnect when the socket is intentionally closed by either party.
     * Default: false
     */
    retryOnClose?: boolean,

    /**
     * Time between retries. (ms)
     * Default: 500
     */
    retryTime?: number,
};

type TypeSocketEventType = 'connected' | 'disconnected' | 'permanentlyDisconnected' | 'message';
type TypeSocketConnectionStateChangeEventListener<T> = (this: TypeSocket<T>) => void;
type TypeSocketMessageEventListener<T> = (this: TypeSocket<T>, message: T) => void;

interface TypeSocketEvents<T> {
    connected: Set<TypeSocketConnectionStateChangeEventListener<T>>,
    disconnected: Set<TypeSocketConnectionStateChangeEventListener<T>>,
    permanentlyDisconnected: Set<TypeSocketConnectionStateChangeEventListener<T>>,
    message: Set<TypeSocketMessageEventListener<T>>,
};

/**
 * TypeSocket class.
 */
export class TypeSocket<T> {
    /**
     * Function that is called when a connection is successfully established.
     */
    onConnected?: () => void;

    /**
     * Function that is called when the socket is disconnected.
     */
    onDisconnected?: () => void;

    /**
     * Function that is called when the socket is permanently disconnected (after running out of retries or being manually disconnected).
     */
    onPermanentlyDisconnected?: () => void;

    /**
     * Function that is called when the message is received.
     * @param {T} message 
     */
    onMessage?: (message: T) => void;

    /**
     * The WebSocket
     */
    private socket: WebSocket | null = null;

    /**
     * Temporary retry counter.
     */
    private retries = 0;

    /**
     * Instance options.
     */
    private options: TypeSocketOptions = {
        maxRetries: 5,
        retryOnClose: false,
        retryTime: 500,
    };

    /**
     * Events
     */
    private events: TypeSocketEvents<T> = {
        connected: new Set(),
        disconnected: new Set(),
        permanentlyDisconnected: new Set(),
        message: new Set(),
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
     */
    connect() {
        if (this.socket) {
            try {
                this.socket.close();
                this.disconnected();
            } catch { }
        }

        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
            this.connected();
        };

        this.socket.onclose = (e) => {
            if (e.code === 1000 || (this.options.retryOnClose && this.socket)) {
                this.reconnectAfterTime(this.options.retryTime);
            } else {
                this.disconnected();
                this.permanentlyDisconnected();
            }
        };

        this.socket.onmessage = (e) => {
            this.message(e.data);
        };

        this.socket.onerror = () => {
            this.disconnected();
            this.socket = null;

            this.reconnectAfterTime(this.options.retryTime);
        };
    }

    /**
     * Sends a JavaScript object of type T to the server.
     * @param data JS object.
     */
    send(data: T) {
        if (!this.socket) return;

        this.socket.send(JSON.stringify(data));
    }

    /**
     * Sends raw data over the socket.
     * @param data Raw data.
     */
    sendRaw(data: string | ArrayBuffer | Blob | ArrayBufferView) {
        if (!this.socket) return;

        this.socket.send(data);
    }

    /**
     * Ready state of the socket.
     */
    get readyState() {
        return this.socket ? this.socket.readyState : 0;
    }

    /**
     * Adds a listener for a message event.
     * @param eventType Event type. (message)
     * @param listener Listener function.
     */
    on(eventType: 'message', listener: TypeSocketMessageEventListener<T>): void;

    /**
     * Adds a listener for a connection event.
     * @param eventType Event type. (connected, disconnected, permanentlyDisconnected)
     * @param listener Listener function.
     */
    on(eventType: 'connected' | 'disconnected' | 'permanentlyDisconnected', listener: TypeSocketConnectionStateChangeEventListener<T>): void;
    
    /**
     * Adds a listener for a given event.
     * @param eventType Event type.
     * @param listener Listener function.
     */
    on(eventType: TypeSocketEventType, listener: Function) {
        this.events[eventType].add(listener as any);
    }

    /**
     * Removes a listener for a message event.
     * @param eventType Event type. (message)
     * @param listener Listener function.
     */
    off(eventType: 'message', listener: TypeSocketMessageEventListener<T>): void;

    /**
     * Removes a listener for a connection event.
     * @param eventType Event type. (connected, disconnected, permanentlyDisconnected)
     * @param listener Listener function.
     */
    off(eventType: 'connected' | 'disconnected' | 'permanentlyDisconnected', listener: TypeSocketConnectionStateChangeEventListener<T>): void;
    
    /**
     * Removes a listener for a given event.
     * @param eventType Event type.
     * @param listener Listener function.
     */
    off(eventType: TypeSocketEventType, listener: Function) {
        this.events[eventType].delete(listener as any);
    }

    /**
     * Emits an event.
     * @param eventType Event type.
     */
    private emit(eventType: TypeSocketEventType, ...args: any[]) {
        for (let listener of this.events[eventType]) {
            (listener as Function).apply(this, args);
        }

        let listenerProperty: Function | null | undefined = null;
        switch (eventType) {
            case 'message':
                listenerProperty = this.onMessage;
                break;
            case 'connected':
                listenerProperty = this.onConnected;
                break;
            case 'disconnected':
                listenerProperty = this.onDisconnected;
                break;
            case 'permanentlyDisconnected':
                listenerProperty = this.onPermanentlyDisconnected;
                break;
        }

        if (listenerProperty) {
            listenerProperty.apply(this, args);
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

    private message(data: string) {
        try {
            const json = JSON.parse(data);
            if (json) {
                this.emit('message', json);
            }
        } catch { }
    }
};