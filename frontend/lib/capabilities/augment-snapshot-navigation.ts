import type { SnapshotNavItem } from "@/features/platform/types/snapshot";
import { DEFAULT_SNAPSHOT_NAVIGATION } from "@/lib/config/snapshot/default-snapshot-context";
import { getRouteCapabilityEntry } from "@/lib/capabilities/route-capability-map";

/**
 * Adds standard nav items for entitled modules missing from snapshot navigation.
 * Snapshot nav defines order/labels; capabilities define what the business may use.
 */
export function augmentSnapshotNavigationWithCapabilities(
  navigation: SnapshotNavItem[],
  hasModule?: (moduleKey: string) => boolean,
): SnapshotNavItem[] {
  if (!hasModule) {
    return navigation;
  }

  const routes = new Set(navigation.map((item) => item.route));
  const augmented: SnapshotNavItem[] = [...navigation];

  for (const preset of DEFAULT_SNAPSHOT_NAVIGATION) {
    if (routes.has(preset.route)) {
      continue;
    }

    const entry = getRouteCapabilityEntry(preset.route);
    if (!entry) {
      continue;
    }

    if (!hasModule(entry.moduleKey)) {
      continue;
    }

    augmented.push({ ...preset });
    routes.add(preset.route);
  }

  return augmented.sort((a, b) => a.order - b.order);
}
