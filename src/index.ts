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
     * Creates a new TypeSocket
     * @param url WebSocket server URL
     */
    constructor(private url: string, options?: TypeSocketOptions) {
        this.connect();

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
     * Ready state of the socket.
     */
    get readyState() {
        return this.socket ? this.socket.readyState : 0;
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

        if (this.onConnected) {
            this.onConnected();
        }
    }

    private disconnected() {
        if (this.onDisconnected) {
            this.onDisconnected();
        }
    }

    private permanentlyDisconnected() {
        if (this.onPermanentlyDisconnected) {
            this.onPermanentlyDisconnected();
        }
    }

    private message(data: string) {
        try {
            const json = JSON.parse(data);
            if (json && this.onMessage) {
                this.onMessage(json);
            }
        } catch { }
    }
};