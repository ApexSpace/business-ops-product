import { REALTIME_EVENTS } from "@/features/realtime/event-handlers";
import type { RealtimeEventPayload } from "@/features/realtime/transport/realtime-event.types";

export function isRealtimeDisabledEvent(payload: RealtimeEventPayload): boolean {
  const event = payload.event;
  return (
    event === REALTIME_EVENTS.disabled || event.endsWith(`.${REALTIME_EVENTS.disabled}`)
  );
}
