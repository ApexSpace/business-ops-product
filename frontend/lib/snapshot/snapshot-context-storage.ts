import type { SnapshotContext } from "@/features/platform/types/snapshot";

const STORAGE_PREFIX = "snapshot-context:";

export interface StoredSnapshotContext {
  businessId: string;
  contextVersion: string;
  terminology: Record<string, string>;
  navigation: SnapshotContext["navigation"];
  dashboard: SnapshotContext["dashboard"];
  branding: SnapshotContext["branding"];
  snapshotId: string | null;
  snapshotName: string;
}

function storageKey(businessId: string): string {
  return `${STORAGE_PREFIX}${businessId}`;
}

export function readStoredSnapshotContext(
  businessId: string | undefined,
): StoredSnapshotContext | undefined {
  if (!businessId || typeof window === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(storageKey(businessId));
    if (!raw) return undefined;
    return JSON.parse(raw) as StoredSnapshotContext;
  } catch {
    return undefined;
  }
}

export function writeStoredSnapshotContext(
  businessId: string,
  context: SnapshotContext,
): void {
  if (typeof window === "undefined") return;
  try {
    const stored: StoredSnapshotContext = {
      businessId,
      contextVersion: context.contextVersion,
      terminology: context.terminology,
      navigation: context.navigation,
      dashboard: context.dashboard,
      branding: context.branding,
      snapshotId: context.snapshotId,
      snapshotName: context.snapshotName,
    };
    sessionStorage.setItem(storageKey(businessId), JSON.stringify(stored));
  } catch {
    // Ignore quota or serialization errors.
  }
}

export function storedToSnapshotContext(
  stored: StoredSnapshotContext,
): SnapshotContext {
  return {
    snapshotId: stored.snapshotId,
    snapshotName: stored.snapshotName,
    contextVersion: stored.contextVersion,
    terminology: stored.terminology,
    navigation: stored.navigation,
    dashboard: stored.dashboard,
    branding: stored.branding,
  };
}
