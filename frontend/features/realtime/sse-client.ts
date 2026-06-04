export type RealtimeEventPayload = {
  event: string;
  data: unknown;
  at?: string;
};

export type SseClientOptions = {
  businessId: string;
  onEvent: (payload: RealtimeEventPayload) => void;
  onDisconnect?: () => void;
  /** Called when max reconnect attempts are exhausted or SSE is disabled upstream */
  onUnavailable?: () => void;
  maxBackoffMs?: number;
  /** Stop reconnecting after this many consecutive connection errors (default 8) */
  maxRetries?: number;
  initialBackoffMs?: number;
};

export class SseClient {
  private es: EventSource | null = null;
  private backoffMs: number;
  private closed = false;
  private failures = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly options: SseClientOptions) {
    this.backoffMs = options.initialBackoffMs ?? 1000;
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

    this.es.onmessage = (message) => {
      this.failures = 0;
      this.backoffMs = this.options.initialBackoffMs ?? 1000;
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
      const maxRetries = this.options.maxRetries ?? 8;
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
    const cap = this.options.maxBackoffMs ?? 30_000;
    const delay = Math.min(this.backoffMs, cap);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.backoffMs = Math.min(this.backoffMs * 2, cap);
      if (!this.closed) this.open();
    }, delay);
  }
}
