import type { UseQueryOptions } from "@tanstack/react-query";
import type { SnapshotContext } from "@/features/platform/types/snapshot";
import { getSnapshotContext } from "@/features/settings/api/snapshot-context.api";
import { queryKeys } from "@/lib/query/keys";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
export const SNAPSHOT_CONTEXT_QUERY_CONFIG = {
  // Snapshot context (navigation/terminology/dashboard config) can change when a
  // platform user applies a new snapshot to the business. Avoid "sticky forever"
  // caches so business users see updates without having to hard refresh.
  staleTime: 0,
  gcTime: TWENTY_FOUR_HOURS_MS,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const;

export function snapshotContextQueryOptions(
  businessId: string | undefined,
): UseQueryOptions<SnapshotContext> {
  return {
    queryKey: queryKeys.business.snapshotContext(businessId ?? ""),
    queryFn: getSnapshotContext,
    enabled: !!businessId,
    ...SNAPSHOT_CONTEXT_QUERY_CONFIG,
  };
}
