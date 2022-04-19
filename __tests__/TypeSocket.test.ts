import { TypeSocket } from '../src';

function mockSocket() {
  const references: any = {
    lastMessage: '',
    socket: undefined,
  };

  global['WebSocket'] = class WebSocket {
    public readyState = 1;
    public onclose?: (e: CloseEvent) => void;
    public onmessage?: (e: MessageEvent) => void;
    public onopen?: () => void;
    public onerror?: () => void;

    constructor(url: string, protocols?: string | string[]) {
      references.socket = this;
    }

    close() {}

    send(data: string) {
      references.lastMessage = data;
    }
  } as any;

  return references;
}

interface MessageModel {
  type: string;
}

describe('TypeSocket', () => {
  it('sends messages', () => {
    const references = mockSocket();
    const typesocket = new TypeSocket<MessageModel>('');

    typesocket.connect();
    references.socket?.onopen();

    typesocket.send({
      type: 'test',
    });

    expect(JSON.parse(references.lastMessage)).toEqual({ type: 'test' });
  });

  it('receives and parses messages', () => {
    const references = mockSocket();
    const typesocket = new TypeSocket<MessageModel>('');

    const fn = jest.fn();
    const fnRaw = jest.fn();
    const data = JSON.stringify({ type: 'test' });

    typesocket.on('message', fn);
    typesocket.on('rawMessage', fnRaw);

    typesocket.connect();
    references.socket?.onopen();
    references.socket?.onmessage({
      data: JSON.stringify({ type: 'test' }),
    });

    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ type: 'test' }));
    expect(fnRaw).toHaveBeenCalledWith(data);
  });

  it('receives and rejects invalid messages', () => {
    const references = mockSocket();
    const typesocket = new TypeSocket<MessageModel>('');

    const fn = jest.fn();
    const data = 'invalid';

    typesocket.on('invalidMessage', fn);

    typesocket.connect();
    references.socket?.onopen();
    references.socket?.onmessage({
      data: data,
    });

    expect(fn).toHaveBeenCalledWith(data);
  });

  it('emits connection events', () => {
    const references = mockSocket();
    const typesocket = new TypeSocket<MessageModel>('');

    const fnConnected = jest.fn();
    const fnDisconnected = jest.fn();
    const fnPermanentlyDisconnected = jest.fn();

    typesocket.on('connected', fnConnected);
    typesocket.on('disconnected', fnDisconnected);
    typesocket.on('permanentlyDisconnected', fnPermanentlyDisconnected);

    typesocket.connect();
    references.socket?.onopen();
    references.socket?.onclose({ code: 0 });

    expect(fnConnected).toHaveBeenCalled();
    expect(fnDisconnected).toHaveBeenCalled();
    expect(fnPermanentlyDisconnected).toHaveBeenCalled();
  });
});
