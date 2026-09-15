/** Socket.io namespace for business realtime events. */
export const REALTIME_SOCKET_NAMESPACE = '/realtime';

/** Matches Redis channel and SSE meta.sseChannel: `business:{businessId}`. */
export const REALTIME_BUSINESS_ROOM_PREFIX = 'business:';

/** Emitted to socket after auth + room join succeed. */
export const REALTIME_SOCKET_READY_EVENT = 'realtime.ready';

/** Carries the Redis envelope `{ event, data, at }` to clients. */
export const REALTIME_SOCKET_EVENT = 'event';

export const REALTIME_DISABLED_EVENT = 'realtime.disabled';

export function realtimeBusinessRoom(businessId: string): string {
  return `${REALTIME_BUSINESS_ROOM_PREFIX}${businessId}`;
}
