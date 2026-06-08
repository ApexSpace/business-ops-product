import { api } from "@/lib/api/client";
import type { SnapshotContext } from "@/features/platform/types/snapshot";

export function getSnapshotContext() {
  return api.get<SnapshotContext>("businesses/current/snapshot-context");
}
