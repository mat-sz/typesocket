export interface TypeSocketOptions {
    maxRetries?: number,
    retryOnClose?: boolean,
    retryTime?: number,
};

export class TypeSocket<T> {
    onConnected?: () => void;
    onDisconnected?: () => void;
    onPermanentlyDisconnected?: () => void;
    onMessage?: (message: T) => void;
    private socket: WebSocket | null = null;
    private retries = 0;
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
            this.disconnected();
            this.socket = null;

            if (e.code === 1000 || this.options.retryOnClose) {
                setTimeout(() => {
                    this.reconnect();
                }, this.options.retryTime);
            } else {
                this.permanentlyDisconnected();
            }
        };

        this.socket.onmessage = (e) => {
            this.message(e.data);
        };

        this.socket.onerror = () => {
            this.disconnected();
            this.socket = null;

            setTimeout(() => {
                this.reconnect();
            }, this.options.retryTime);
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