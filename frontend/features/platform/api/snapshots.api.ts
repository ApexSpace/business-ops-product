import { api } from "@/lib/api/client";
import type {
  Snapshot,
  SnapshotListItem,
} from "@/features/platform/types/snapshot";
import type { PaginatedResult } from "@/features/platform/types";

export type PlatformSnapshotsListFilters = {
  page?: number;
  limit?: number;
  status?: string;
};

export async function listPlatformSnapshots(
  filters: PlatformSnapshotsListFilters = {},
): Promise<PaginatedResult<SnapshotListItem>> {
  const { items, meta } = await api.getPaginated<SnapshotListItem>(
    "platform/snapshots",
    {
      searchParams: {
        page: filters.page,
        limit: filters.limit,
        status: filters.status,
      },
    },
  );
  return { items, meta };
}

export function getPlatformSnapshot(id: string) {
  return api.get<Snapshot>(`platform/snapshots/${id}`);
}

export function createPlatformSnapshot(body: Record<string, unknown>) {
  return api.post<Snapshot>("platform/snapshots", body);
}

export function updatePlatformSnapshot(
  id: string,
  body: Record<string, unknown>,
) {
  return api.patch<Snapshot>(`platform/snapshots/${id}`, body);
}

export function publishPlatformSnapshot(id: string) {
  return api.post<Snapshot>(`platform/snapshots/${id}/publish`);
}

export function archivePlatformSnapshot(id: string) {
  return api.post<Snapshot>(`platform/snapshots/${id}/archive`);
}

export function clonePlatformSnapshot(id: string, body?: { name?: string }) {
  return api.post<Snapshot>(`platform/snapshots/${id}/clone`, body);
}

export function applyPlatformSnapshot(
  id: string,
  body: { businessId: string },
) {
  return api.post<void>(`platform/snapshots/${id}/apply`, body);
}

export function deletePlatformSnapshot(id: string) {
  return api.delete<void>(`platform/snapshots/${id}?confirm=true`);
}
