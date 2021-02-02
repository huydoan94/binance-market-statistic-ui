import { noop } from 'lodash';
import { electronImport } from './utils/electron';

const WebSocket = electronImport('ws');

class BinanceWebSocket {
  url = null
  messageHandler = noop

  socketClient = null

  pingTimeout = null

  pingWaitTimeout = null

  constructor(url, messageHandler) {
    this.url = url;
    this.messageHandler = messageHandler;
    this.createSocketClient();
  }

  createSocketClient = async () => {
    this.socketClient = new WebSocket(this.url);
    this.socketClient.on('open', this.openHandler);
    this.socketClient.on('message', this.messageHandler);
    this.socketClient.on('error', this.errorHandler);
    this.socketClient.on('close', this.closeHandler);
    this.socketClient.on('ping', this.pingPongHandler);
    this.socketClient.on('pong', this.pingPongHandler);
  }

  closeSocketClient = () => {
    this.socketClient.close();
  }

  openHandler = () => {
    this.setPingTimeout();
  }

  errorHandler = () => {
    this.socketClient.close();
  }

  closeHandler = () => {
    clearTimeout(this.pingTimeout);
    clearTimeout(this.pingWaitTimeout);
    setTimeout(() => this.createSocketClient(), 1000);
  };

  pingPongHandler = () => {
    clearTimeout(this.pingTimeout);
    clearTimeout(this.pingWaitTimeout);

    this.setPingTimeout();
  }

  ping = () => {
    this.socketClient.ping();
    this.pingWaitTimeout = setTimeout(
      () => this.socketClient.close(),
      60 * 1000,
    );
  }

  setPingTimeout = () => {
    this.pingTimeout = setTimeout(
      () => this.ping(),
      20 * 60 * 1000,
    );
  }
}

export default BinanceWebSocket;
