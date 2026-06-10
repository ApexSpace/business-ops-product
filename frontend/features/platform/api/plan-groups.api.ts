import { api } from "@/lib/api/client";
import type { PaginatedResult } from "@/features/platform/types";
import type {
  PlanEmbedSettings,
  PlanFeatureRow,
  PlanGroupDetail,
  PlanGroupListItem,
  PlanGroupStats,
  PlanTier,
  PublicPricing,
} from "@/features/platform/types/plan-group";

export type PlatformPlanGroupsListFilters = {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
};

export async function listPlatformPlanGroups(
  filters: PlatformPlanGroupsListFilters = {},
): Promise<PaginatedResult<PlanGroupListItem>> {
  const { items, meta } = await api.getPaginated<PlanGroupListItem>(
    "platform/plan-groups",
    {
      searchParams: {
        page: filters.page,
        limit: filters.limit,
        status: filters.status,
        search: filters.search,
      },
    },
  );
  return { items, meta };
}

export function getPlatformPlanGroupStats() {
  return api.get<PlanGroupStats>("platform/plan-groups/stats");
}

export function getPlatformPlanGroup(id: string) {
  return api.get<PlanGroupDetail>(`platform/plan-groups/${id}`);
}

export function createPlatformPlanGroup(body: Record<string, unknown>) {
  return api.post<PlanGroupDetail>("platform/plan-groups", body);
}

export function updatePlatformPlanGroup(
  id: string,
  body: Record<string, unknown>,
) {
  return api.patch<PlanGroupDetail>(`platform/plan-groups/${id}`, body);
}

export function deletePlatformPlanGroup(id: string) {
  return api.delete<void>(`platform/plan-groups/${id}`);
}

export function publishPlatformPlanGroup(id: string) {
  return api.post<PlanGroupDetail>(`platform/plan-groups/${id}/publish`);
}

export function movePlatformPlanGroupToDraft(id: string) {
  return api.post<PlanGroupDetail>(`platform/plan-groups/${id}/move-to-draft`);
}

export function archivePlatformPlanGroup(id: string) {
  return api.post<PlanGroupDetail>(`platform/plan-groups/${id}/archive`);
}

export function getPlatformPlanGroupPreview(id: string) {
  return api.get<PublicPricing>(`platform/plan-groups/${id}/preview`);
}

export function listPlatformPlanGroupTiers(planGroupId: string) {
  return api.get<PlanTier[]>(`platform/plan-groups/${planGroupId}/tiers`);
}

export interface PlanTierDefaults {
  planGroupId: string;
  planTierId: string;
  suggestedSnapshotId?: string | null;
  suggestedSnapshotName?: string | null;
  capabilities: { key: string; name: string }[];
  amount?: string | null;
  currency: string;
  trialDays?: number | null;
}

export function getPlatformPlanGroupTierDefaults(
  planGroupId: string,
  tierId: string,
) {
  return api.get<PlanTierDefaults>(
    `platform/plan-groups/${planGroupId}/tiers/${tierId}/defaults`,
  );
}

export function getPlatformPlanGroupDefaults(planGroupId: string) {
  return api.get<{
    planGroupId: string;
    suggestedSnapshotId?: string | null;
    suggestedSnapshotName?: string | null;
    currency: string;
  }>(`platform/plan-groups/${planGroupId}/defaults`);
}

export function createPlatformPlanTier(
  planGroupId: string,
  body: Record<string, unknown>,
) {
  return api.post<PlanTier>(`platform/plan-groups/${planGroupId}/tiers`, body);
}

export function updatePlatformPlanTier(
  planGroupId: string,
  tierId: string,
  body: Record<string, unknown>,
) {
  return api.patch<PlanTier>(
    `platform/plan-groups/${planGroupId}/tiers/${tierId}`,
    body,
  );
}

export function deletePlatformPlanTier(planGroupId: string, tierId: string) {
  return api.delete<void>(
    `platform/plan-groups/${planGroupId}/tiers/${tierId}`,
  );
}

export function assignPlatformPlanTierCapabilities(
  planGroupId: string,
  tierId: string,
  capabilityIds: string[],
) {
  return api.post<{ assigned: number; skipped: number }>(
    `platform/plan-groups/${planGroupId}/tiers/${tierId}/capabilities`,
    { capabilityIds },
  );
}

export function removePlatformPlanTierCapability(
  planGroupId: string,
  tierId: string,
  capabilityId: string,
) {
  return api.delete<PlanTier>(
    `platform/plan-groups/${planGroupId}/tiers/${tierId}/capabilities/${capabilityId}`,
  );
}

export function reorderPlatformPlanTierCapabilities(
  planGroupId: string,
  tierId: string,
  capabilityIds: string[],
) {
  return api.patch<PlanTier>(
    `platform/plan-groups/${planGroupId}/tiers/${tierId}/capabilities/reorder`,
    { capabilityIds },
  );
}

export function listPlatformPlanGroupFeatureRows(planGroupId: string) {
  return api.get<PlanFeatureRow[]>(
    `platform/plan-groups/${planGroupId}/feature-rows`,
  );
}

export function createPlatformPlanFeatureRow(
  planGroupId: string,
  body: Record<string, unknown>,
) {
  return api.post<PlanFeatureRow>(
    `platform/plan-groups/${planGroupId}/feature-rows`,
    body,
  );
}

export function updatePlatformPlanFeatureRow(
  planGroupId: string,
  rowId: string,
  body: Record<string, unknown>,
) {
  return api.patch<PlanFeatureRow>(
    `platform/plan-groups/${planGroupId}/feature-rows/${rowId}`,
    body,
  );
}

export function deletePlatformPlanFeatureRow(
  planGroupId: string,
  rowId: string,
) {
  return api.delete<void>(
    `platform/plan-groups/${planGroupId}/feature-rows/${rowId}`,
  );
}

export function reorderPlatformPlanFeatureRows(
  planGroupId: string,
  rowIds: string[],
) {
  return api.patch<PlanFeatureRow[]>(
    `platform/plan-groups/${planGroupId}/feature-rows/reorder`,
    { rowIds },
  );
}

export function getPlatformPlanGroupEmbed(planGroupId: string) {
  return api.get<PlanEmbedSettings>(
    `platform/plan-groups/${planGroupId}/embed`,
  );
}

export function updatePlatformPlanGroupEmbed(
  planGroupId: string,
  body: Record<string, unknown>,
) {
  return api.patch<PlanEmbedSettings>(
    `platform/plan-groups/${planGroupId}/embed`,
    body,
  );
}
