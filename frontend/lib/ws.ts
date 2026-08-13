import { WSEvent } from "./types";
import { API_BASE } from "./api";


type Listener = (
  event: WSEvent
) => void;


class WSClient {
  private socket: WebSocket | null =
    null;

  private listeners =
    new Set<Listener>();

  private reconnectDelay = 1000;

  private reconnectTimer:
    ReturnType<typeof setTimeout> | null =
    null;

  private shouldReconnect = true;

  private token: string | null =
    null;


  connect(token: string) {
    if (
      this.token === token &&
      this.socket &&
      (
        this.socket.readyState ===
          WebSocket.OPEN ||
        this.socket.readyState ===
          WebSocket.CONNECTING
      )
    ) {
      return;
    }

    this.token = token;
    this.shouldReconnect = true;

    this.clearReconnectTimer();

    this.closeSocket();

    this.open();
  }


  private open() {
    if (
      !this.token ||
      !this.shouldReconnect
    ) {
      return;
    }

    if (
      this.socket &&
      (
        this.socket.readyState ===
          WebSocket.OPEN ||
        this.socket.readyState ===
          WebSocket.CONNECTING
      )
    ) {
      return;
    }

    const wsBase =
      API_BASE.replace(
        /^http/,
        "ws"
      );

    const socket =
      new WebSocket(
        `${wsBase}/ws?token=${encodeURIComponent(
          this.token
        )}`
      );

    this.socket = socket;


    socket.onopen = () => {
      this.reconnectDelay = 1000;
    };


    socket.onmessage = (
      message
    ) => {
      try {
        const event =
          JSON.parse(
            message.data
          ) as WSEvent;

        this.listeners.forEach(
          (listener) => {
            listener(event);
          }
        );

      } catch {
        // Ignore malformed frames.
      }
    };


    socket.onerror = () => {
      // Closing here allows onclose to handle
      // the reconnect logic consistently.
      try {
        socket.close();
      } catch {
        // Ignore.
      }
    };


    socket.onclose = () => {
      if (
        this.socket === socket
      ) {
        this.socket = null;
      }

      if (
        !this.shouldReconnect ||
        !this.token
      ) {
        return;
      }

      this.scheduleReconnect();
    };
  }


  private scheduleReconnect() {
    if (
      this.reconnectTimer !== null
    ) {
      return;
    }

    const delay =
      this.reconnectDelay;

    this.reconnectDelay =
      Math.min(
        this.reconnectDelay * 1.5,
        10000
      );

    this.reconnectTimer =
      setTimeout(() => {
        this.reconnectTimer =
          null;

        this.open();
      }, delay);
  }


  private clearReconnectTimer() {
    if (
      this.reconnectTimer !== null
    ) {
      clearTimeout(
        this.reconnectTimer
      );

      this.reconnectTimer =
        null;
    }
  }


  private closeSocket() {
    if (!this.socket) {
      return;
    }

    const socket =
      this.socket;

    this.socket = null;

    socket.onclose = null;

    try {
      socket.close();
    } catch {
      // Ignore.
    }
  }


  send(event: {
    type: string;
    payload: unknown;
  }) {
    if (
      !this.socket ||
      this.socket.readyState !==
        WebSocket.OPEN
    ) {
      return false;
    }

    this.socket.send(
      JSON.stringify(event)
    );

    return true;
  }


  disconnect() {
    this.shouldReconnect = false;
    this.token = null;

    this.clearReconnectTimer();

    this.closeSocket();

    this.reconnectDelay = 1000;
  }


  subscribe(
    listener: Listener
  ): () => void {
    this.listeners.add(
      listener
    );

    return () => {
      this.listeners.delete(
        listener
      );
    };
  }
}


export const wsClient =
  new WSClient();