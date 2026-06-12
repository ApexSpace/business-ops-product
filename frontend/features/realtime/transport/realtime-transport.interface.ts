import type { RealtimeEventPayload } from "./realtime-event.types";

export type RealtimeTransportKind = "websocket" | "sse";

export type RealtimeTransportCallbacks = {
  businessId: string;
  onEvent: (payload: RealtimeEventPayload) => void;
  onDisconnect?: () => void;
  onUnavailable?: () => void;
  onConnected?: (kind: RealtimeTransportKind) => void;
  maxBackoffMs?: number;
  maxRetries?: number;
  initialBackoffMs?: number;
};

export interface RealtimeTransport {
  readonly kind: RealtimeTransportKind;
  connect(): void;
  close(): void;
}
