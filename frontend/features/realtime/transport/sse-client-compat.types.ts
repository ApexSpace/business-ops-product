import type { RealtimeEventPayload } from "./realtime-event.types";

/** @deprecated Use RealtimeTransportCallbacks from realtime-transport.interface */
export type SseClientOptions = {
  businessId: string;
  onEvent: (payload: RealtimeEventPayload) => void;
  onDisconnect?: () => void;
  onUnavailable?: () => void;
  maxBackoffMs?: number;
  maxRetries?: number;
  initialBackoffMs?: number;
};
