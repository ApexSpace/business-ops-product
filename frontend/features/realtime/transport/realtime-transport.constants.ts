export const DEFAULT_REALTIME_INITIAL_BACKOFF_MS = 1_000;
export const DEFAULT_REALTIME_MAX_BACKOFF_MS = 30_000;
export const DEFAULT_REALTIME_MAX_RETRIES = 8;

/** Socket.io server event carrying the Redis envelope. */
export const REALTIME_SOCKET_EVENT = 'event';

/** Emitted by gateway when auth + room join succeed (Phase 1). */
export const REALTIME_SOCKET_READY_EVENT = 'realtime.ready';
