/**
 * Client capability flags for gradual mobile rollout (Phase 4).
 * Sync with backend when a formal flags API exists.
 *
 * Realtime SSE: set NEXT_PUBLIC_ENABLE_SSE=true when REDIS_URL is configured.
 * Without Redis the stream connects once and emits realtime.disabled (polling only).
 */
export const FEATURE_FLAGS = {
  realtimeSse: process.env.NEXT_PUBLIC_ENABLE_SSE === "true",
  virtualizedLists: true,
  infiniteMessageHistory: true,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}

export function enabledFeatureFlags(): string[] {
  return (Object.keys(FEATURE_FLAGS) as FeatureFlag[]).filter((key) =>
    isFeatureEnabled(key),
  );
}
