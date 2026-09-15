import { io, type Socket } from "socket.io-client";
import { getBackendWebSocketUrl } from "@/lib/config/backend-ws-url";
import type { RealtimeEventPayload } from "./realtime-event.types";
import {
  DEFAULT_REALTIME_INITIAL_BACKOFF_MS,
  DEFAULT_REALTIME_MAX_BACKOFF_MS,
  DEFAULT_REALTIME_MAX_RETRIES,
  REALTIME_SOCKET_EVENT,
  REALTIME_SOCKET_READY_EVENT,
} from "./realtime-transport.constants";
import type {
  RealtimeTransport,
  RealtimeTransportCallbacks,
  RealtimeTransportKind,
} from "./realtime-transport.interface";

export type SocketIoTransportOptions = RealtimeTransportCallbacks & {
  getAccessToken?: () => string | null | Promise<string | null>;
};

export class SocketIoTransport implements RealtimeTransport {
  readonly kind: RealtimeTransportKind = "websocket";

  private socket: Socket | null = null;
  private backoffMs: number;
  private closed = false;
  private failures = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectInFlight: Promise<void> | null = null;

  constructor(private readonly options: SocketIoTransportOptions) {
    this.backoffMs = options.initialBackoffMs ?? DEFAULT_REALTIME_INITIAL_BACKOFF_MS;
  }

  connect(): void {
    this.closed = false;
    this.failures = 0;
    void this.open();
  }

  close(): void {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.connectInFlight = null;
  }

  private async open(): Promise<void> {
    if (this.closed || this.connectInFlight) return;

    const wsOrigin = getBackendWebSocketUrl();
    if (!wsOrigin) {
      this.options.onUnavailable?.();
      return;
    }

    this.connectInFlight = this.connectSocket(wsOrigin).finally(() => {
      this.connectInFlight = null;
    });
    await this.connectInFlight;
  }

  private async connectSocket(wsOrigin: string): Promise<void> {
    if (this.closed) return;

    const token = this.options.getAccessToken
      ? await this.options.getAccessToken()
      : null;

    if (!token) {
      this.options.onUnavailable?.();
      return;
    }

    const socket = io(`${wsOrigin}/realtime`, {
      transports: ["websocket"],
      auth: {
        token,
        businessId: this.options.businessId,
      },
      reconnection: false,
      withCredentials: true,
    });

    this.socket = socket;

    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanup();
        this.failures = 0;
        this.backoffMs =
          this.options.initialBackoffMs ?? DEFAULT_REALTIME_INITIAL_BACKOFF_MS;
        this.options.onConnected?.("websocket");
        resolve();
      };

      const onConnectError = (error: Error) => {
        cleanup();
        reject(error);
      };

      let settled = false;
      let connectFallbackTimer: ReturnType<typeof setTimeout> | null = null;

      const settleReady = () => {
        if (settled) return;
        settled = true;
        onReady();
      };

      const onConnect = () => {
        // Phase 1 emits realtime.ready after room join; fallback to connect for stub gateway.
        connectFallbackTimer = setTimeout(settleReady, 150);
      };

      const cleanup = () => {
        if (connectFallbackTimer) clearTimeout(connectFallbackTimer);
        socket.off(REALTIME_SOCKET_READY_EVENT, settleReady);
        socket.off("connect_error", onConnectError);
        socket.off("connect", onConnect);
      };

      socket.on(REALTIME_SOCKET_READY_EVENT, settleReady);
      socket.on("connect", onConnect);
      socket.on("connect_error", onConnectError);

      socket.on(REALTIME_SOCKET_EVENT, (payload: RealtimeEventPayload) => {
        if (payload && typeof payload === "object" && "event" in payload) {
          this.options.onEvent(payload);
        }
      });

      socket.on("disconnect", () => {
        if (this.closed) return;
        this.options.onDisconnect?.();
        this.handleFailure();
      });
    }).catch(() => {
      socket.removeAllListeners();
      socket.disconnect();
      if (this.socket === socket) {
        this.socket = null;
      }
      this.handleFailure();
    });
  }

  private handleFailure(): void {
    if (this.closed) return;

    this.failures += 1;
    const maxRetries = this.options.maxRetries ?? DEFAULT_REALTIME_MAX_RETRIES;
    if (this.failures >= maxRetries) {
      this.closed = true;
      this.options.onUnavailable?.();
      return;
    }

    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const cap = this.options.maxBackoffMs ?? DEFAULT_REALTIME_MAX_BACKOFF_MS;
    const delay = Math.min(this.backoffMs, cap);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.backoffMs = Math.min(this.backoffMs * 2, cap);
      if (!this.closed) void this.open();
    }, delay);
  }
}
