import type { BLEDeviceScan, ConnectionState } from "./types";

type Listener = (event: BLEDeviceScan) => void;
type StateListener = (state: ConnectionState) => void;

export class ScanWebSocketClient {
  private socket: WebSocket | null = null;
  private retryTimer: number | null = null;
  private listeners = new Set<Listener>();
  private stateListeners = new Set<StateListener>();
  private closedByUser = false;

  constructor(private url: string) {}

  connect() {
    this.closedByUser = false;
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) return;
    this.emitState("Reconnecting");
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => this.emitState("Connected");
    this.socket.onmessage = (message) => {
      try {
        this.listeners.forEach((listener) => listener(JSON.parse(message.data)));
      } catch {
        // Invalid server messages are ignored by the dashboard.
      }
    };
    this.socket.onclose = () => {
      this.emitState("Disconnected");
      this.socket = null;
      if (!this.closedByUser) this.scheduleReconnect();
    };
    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  disconnect() {
    this.closedByUser = true;
    if (this.retryTimer) window.clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.socket?.close();
    this.socket = null;
    this.emitState("Disconnected");
  }

  onEvent(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onState(listener: StateListener) {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private scheduleReconnect() {
    if (this.retryTimer) return;
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, 3000);
  }

  private emitState(state: ConnectionState) {
    this.stateListeners.forEach((listener) => listener(state));
  }
}
