import type { RealtimeEventPayload } from "./realtime-event.types";
import {
  DEFAULT_REALTIME_INITIAL_BACKOFF_MS,
  DEFAULT_REALTIME_MAX_BACKOFF_MS,
  DEFAULT_REALTIME_MAX_RETRIES,
} from "./realtime-transport.constants";
import type {
  RealtimeTransport,
  RealtimeTransportCallbacks,
  RealtimeTransportKind,
} from "./realtime-transport.interface";

export class SseTransport implements RealtimeTransport {
  readonly kind: RealtimeTransportKind = "sse";

  private es: EventSource | null = null;
  private backoffMs: number;
  private closed = false;
  private failures = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly options: RealtimeTransportCallbacks) {
    this.backoffMs = options.initialBackoffMs ?? DEFAULT_REALTIME_INITIAL_BACKOFF_MS;
  }

  connect(): void {
    this.closed = false;
    this.failures = 0;
    this.open();
  }

  close(): void {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.es?.close();
    this.es = null;
  }

  private open(): void {
    if (this.closed) return;

    const url = `/api/realtime/events?businessId=${encodeURIComponent(this.options.businessId)}`;
    this.es = new EventSource(url, { withCredentials: true });

    this.es.onopen = () => {
      this.failures = 0;
      this.backoffMs = this.options.initialBackoffMs ?? DEFAULT_REALTIME_INITIAL_BACKOFF_MS;
      this.options.onConnected?.("sse");
    };

    this.es.onmessage = (message) => {
      this.failures = 0;
      this.backoffMs = this.options.initialBackoffMs ?? DEFAULT_REALTIME_INITIAL_BACKOFF_MS;
      try {
        const payload = JSON.parse(message.data) as RealtimeEventPayload;
        this.options.onEvent(payload);
      } catch {
        // ignore malformed payloads
      }
    };

    this.es.onerror = () => {
      this.es?.close();
      this.es = null;
      this.options.onDisconnect?.();

      if (this.closed) return;

      this.failures += 1;
      const maxRetries = this.options.maxRetries ?? DEFAULT_REALTIME_MAX_RETRIES;
      if (this.failures >= maxRetries) {
        this.closed = true;
        this.options.onUnavailable?.();
        return;
      }

      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const cap = this.options.maxBackoffMs ?? DEFAULT_REALTIME_MAX_BACKOFF_MS;
    const delay = Math.min(this.backoffMs, cap);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.backoffMs = Math.min(this.backoffMs * 2, cap);
      if (!this.closed) this.open();
    }, delay);
  }
}
