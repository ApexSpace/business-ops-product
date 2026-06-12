import type { RealtimeClientMode } from "@/features/realtime/transport/realtime-client";
import { isFeatureEnabled } from "@/lib/config/feature-flags";

export function isAnyRealtimeTransportEnabled(): boolean {
  return (
    isFeatureEnabled("realtimeWebSocket") || isFeatureEnabled("realtimeSse")
  );
}

/** Safety-net polling while realtime stream is active vs fully degraded. */
export function getRealtimePollIntervalMs(mode: RealtimeClientMode): number {
  if (mode === "polling-only") {
    return 5_000;
  }
  return 30_000;
}
