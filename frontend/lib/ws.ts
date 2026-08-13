import { WSEvent } from "./types";
import { API_BASE } from "./api";

type Listener = (event: WSEvent) => void;

class WSClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;
  private token: string | null = null;
  private generation = 0;

  connect(token: string) {
    if (typeof window === "undefined") return;

    const sameToken = this.token === token;
    const state = this.socket?.readyState;

    if (
      sameToken &&
      (state === WebSocket.OPEN || state === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.disconnect();
    this.token = token;
    this.shouldReconnect = true;
    this.reconnectDelay = 1000;
    this.open(++this.generation);
  }

  private open(generation: number) {
    if (!this.token || !this.shouldReconnect || generation !== this.generation) {
      return;
    }

    const wsBase = API_BASE.replace(/^http/, "ws");
    const socket = new WebSocket(
      `${wsBase}/ws?token=${encodeURIComponent(this.token)}`
    );
    this.socket = socket;

    socket.onopen = () => {
      if (generation !== this.generation) {
        socket.close();
        return;
      }
      this.reconnectDelay = 1000;
    };

    socket.onmessage = (message) => {
      if (generation !== this.generation) return;

      try {
        const event: WSEvent = JSON.parse(message.data);
        this.listeners.forEach((listener) => listener(event));
      } catch {
        // Ignore malformed WebSocket frames.
      }
    };

    socket.onclose = () => {
      if (generation !== this.generation || !this.shouldReconnect) return;

      this.socket = null;
      this.scheduleReconnect(generation);
    };

    socket.onerror = () => {
      // onclose will perform the reconnect.
    };
  }

  private scheduleReconnect(generation: number) {
    if (this.reconnectTimer || !this.shouldReconnect) return;

    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 10000);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.open(generation);
    }, delay);
  }

  send(event: { type: string; payload: unknown }) {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(event));
  }

  disconnect() {
    this.shouldReconnect = false;
    this.generation += 1;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const socket = this.socket;
    this.socket = null;
    socket?.close();
    this.token = null;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const wsClient = new WSClient();
export default wsClient;
