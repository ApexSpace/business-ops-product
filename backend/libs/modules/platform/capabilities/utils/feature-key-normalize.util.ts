import {
  LEGACY_FEATURE_KEY_MAP,
  normalizeFeatureKey,
} from '../registries/capability-feature.registry';

export { LEGACY_FEATURE_KEY_MAP, normalizeFeatureKey };

/**
 * Pure mapping used by DB migration: only keys that actually rename.
 * Identity mappings are excluded.
 */
export function getFeatureKeyRenamePairs(): Array<{
  from: string;
  to: string;
}> {
  const pairs: Array<{ from: string; to: string }> = [];
  for (const [from, to] of Object.entries(LEGACY_FEATURE_KEY_MAP)) {
    const normalized = normalizeFeatureKey(from);
    if (normalized !== from) {
      pairs.push({ from, to: normalized });
    }
  }
  return pairs;
}

/** Derive module key from a registry feature key (first segment). */
export function moduleKeyFromFeatureKey(featureKey: string): string {
  const normalized = normalizeFeatureKey(featureKey);
  const dot = normalized.indexOf('.');
  return dot === -1 ? normalized : normalized.slice(0, dot);
}
