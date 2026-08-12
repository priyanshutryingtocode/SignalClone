import { WSEvent } from "./types";
import { API_BASE } from "./api";

type Listener = (event: WSEvent) => void;

class WSClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private reconnectDelay = 1000;
  private shouldReconnect = true;
  private token: string | null = null;

  connect(token: string) {
    this.token = token;
    this.shouldReconnect = true;
    this.open();
  }

  private open() {
    if (!this.token) return;
    const wsBase = API_BASE.replace(/^http/, "ws");
    this.socket = new WebSocket(`${wsBase}/ws?token=${encodeURIComponent(this.token)}`);

    this.socket.onopen = () => {
      this.reconnectDelay = 1000;
    };

    this.socket.onmessage = (msg) => {
      try {
        const event: WSEvent = JSON.parse(msg.data);
        this.listeners.forEach((l) => l(event));
      } catch {
        /* ignore malformed frame */
      }
    };

    this.socket.onclose = () => {
      if (this.shouldReconnect) {
        setTimeout(() => this.open(), this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 10000);
      }
    };
  }

  send(event: { type: string; payload: unknown }) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(event));
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    this.socket?.close();
    this.socket = null;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const wsClient = new WSClient();
