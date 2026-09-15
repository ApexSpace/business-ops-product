/**
 * Client capability flags for gradual mobile rollout (Phase 4).
 * Sync with backend when a formal flags API exists.
 *
 * Realtime SSE: set NEXT_PUBLIC_ENABLE_SSE=true when REDIS_URL is configured.
 * Without Redis the stream connects once and emits realtime.disabled (polling only).
 *
 * Realtime WebSocket (Phase 0+): set NEXT_PUBLIC_ENABLE_WEBSOCKET=true when
 * REALTIME_WEBSOCKET_ENABLED=true on the API. Use NEXT_PUBLIC_REALTIME_TRANSPORT
 * to prefer websocket, sse, or auto (websocket then sse then polling).
 */
export type RealtimeTransportPreference = "auto" | "websocket" | "sse";

export const FEATURE_FLAGS = {
  realtimeSse: process.env.NEXT_PUBLIC_ENABLE_SSE === "true",
  realtimeWebSocket: process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET === "true",
  virtualizedLists: true,
  infiniteMessageHistory: true,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}

export function getRealtimeTransportPreference(): RealtimeTransportPreference {
  const raw = process.env.NEXT_PUBLIC_REALTIME_TRANSPORT?.trim().toLowerCase();
  if (raw === "websocket" || raw === "sse" || raw === "auto") {
    return raw;
  }
  return "auto";
}

export function enabledFeatureFlags(): string[] {
  return (Object.keys(FEATURE_FLAGS) as FeatureFlag[]).filter((key) =>
    isFeatureEnabled(key),
  );
}
