import {
  getRealtimeTransportPreference,
  isFeatureEnabled,
} from "@/lib/config/feature-flags";
import type { RealtimeEventPayload } from "./realtime-event.types";
import {
  DEFAULT_REALTIME_INITIAL_BACKOFF_MS,
  DEFAULT_REALTIME_MAX_BACKOFF_MS,
  DEFAULT_REALTIME_MAX_RETRIES,
} from "./realtime-transport.constants";
import { isRealtimeDisabledEvent } from "@/features/realtime/realtime-event.util";
import type { RealtimeTransportKind } from "./realtime-transport.interface";
import { SseTransport } from "./sse-transport";
import { SocketIoTransport } from "./socket-io-transport";

export type RealtimeClientMode = "websocket" | "sse" | "polling-only";

export type RealtimeClientOptions = {
  businessId: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  onEvent: (payload: RealtimeEventPayload) => void;
  onDisconnect?: () => void;
  onUnavailable?: () => void;
  onModeChange?: (mode: RealtimeClientMode) => void;
  maxBackoffMs?: number;
  maxRetries?: number;
  initialBackoffMs?: number;
};

/** Orchestrates WebSocket → SSE → polling-only fallback. */
export class RealtimeClient {
  private activeTransport: SseTransport | SocketIoTransport | null = null;
  private mode: RealtimeClientMode = "polling-only";
  private closed = false;

  constructor(private readonly options: RealtimeClientOptions) {}

  connect(): void {
    this.closed = false;
    const preference = getRealtimeTransportPreference();

    if (preference === "websocket" || preference === "auto") {
      if (isFeatureEnabled("realtimeWebSocket")) {
        this.startWebSocket();
        return;
      }
      if (preference === "websocket") {
        this.setMode("polling-only");
        this.options.onUnavailable?.();
        return;
      }
    }

    this.startSse();
  }

  close(): void {
    this.closed = true;
    this.activeTransport?.close();
    this.activeTransport = null;
  }

  getMode(): RealtimeClientMode {
    return this.mode;
  }

  private dispatchEvent(payload: RealtimeEventPayload): void {
    if (isRealtimeDisabledEvent(payload) && this.mode === "websocket") {
      this.activeTransport?.close();
      this.activeTransport = null;
      this.fallbackToSse();
      return;
    }

    this.options.onEvent(payload);
  }

  private startWebSocket(): void {
    const transport = new SocketIoTransport({
      businessId: this.options.businessId,
      getAccessToken: this.options.getAccessToken,
      onEvent: (payload) => this.dispatchEvent(payload),
      onConnected: () => this.setMode("websocket"),
      onDisconnect: this.options.onDisconnect,
      onUnavailable: () => {
        if (this.closed) return;
        transport.close();
        if (this.activeTransport === transport) {
          this.activeTransport = null;
        }
        this.fallbackToSse();
      },
      maxBackoffMs: this.options.maxBackoffMs ?? DEFAULT_REALTIME_MAX_BACKOFF_MS,
      maxRetries: this.options.maxRetries ?? DEFAULT_REALTIME_MAX_RETRIES,
      initialBackoffMs:
        this.options.initialBackoffMs ?? DEFAULT_REALTIME_INITIAL_BACKOFF_MS,
    });

    this.activeTransport = transport;
    transport.connect();
  }

  private fallbackToSse(): void {
    if (this.closed) return;

    if (
      getRealtimeTransportPreference() === "websocket" ||
      !isFeatureEnabled("realtimeSse")
    ) {
      this.setMode("polling-only");
      this.options.onUnavailable?.();
      return;
    }

    this.startSse();
  }

  private startSse(): void {
    if (this.closed) return;
    if (!isFeatureEnabled("realtimeSse")) {
      this.setMode("polling-only");
      this.options.onUnavailable?.();
      return;
    }

    const transport = new SseTransport({
      businessId: this.options.businessId,
      onEvent: (payload) => this.dispatchEvent(payload),
      onConnected: () => this.setMode("sse"),
      onDisconnect: this.options.onDisconnect,
      onUnavailable: () => {
        if (this.closed) return;
        transport.close();
        if (this.activeTransport === transport) {
          this.activeTransport = null;
        }
        this.setMode("polling-only");
        this.options.onUnavailable?.();
      },
      maxBackoffMs: this.options.maxBackoffMs ?? DEFAULT_REALTIME_MAX_BACKOFF_MS,
      maxRetries: this.options.maxRetries ?? DEFAULT_REALTIME_MAX_RETRIES,
      initialBackoffMs:
        this.options.initialBackoffMs ?? DEFAULT_REALTIME_INITIAL_BACKOFF_MS,
    });

    this.activeTransport = transport;
    transport.connect();
  }

  private setMode(mode: RealtimeClientMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.options.onModeChange?.(mode);
  }
}

export type { RealtimeTransportKind };
