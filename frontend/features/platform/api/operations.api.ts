import { api } from "@/lib/api/client";
import type { PaginatedResult } from "@/features/platform/types";

export type CampaignType =
  | "TIER_PRICE"
  | "TIER_CAPABILITY"
  | "CAPABILITY_FEATURE"
  | "ADDON_PACKAGING";

export type CampaignStatus =
  | "OPEN"
  | "NOTIFIED"
  | "DUE"
  | "COMPLETED"
  | "CANCELLED";

export type CampaignPolicy =
  | "KEEP_GRANDFATHERED"
  | "FORCE_REMOVE"
  | "CONVERT_TO_PURCHASED"
  | "APPLY_NEW_PRICE";

export type CampaignMemberStatus =
  | "PENDING"
  | "NOTIFIED"
  | "EXTENDED"
  | "MIGRATED"
  | "EXCLUDED";

export type CampaignMember = {
  id: string;
  businessId: string;
  businessName: string;
  included: boolean;
  status: CampaignMemberStatus;
  effectiveAt: string | null;
  notifiedAt: string | null;
  migratedAt: string | null;
};

export type CampaignGroup = {
  tierId: string | null;
  tierName: string | null;
  businesses: CampaignMember[];
};

export type OperationsCampaign = {
  id: string;
  type: CampaignType;
  status: CampaignStatus;
  policy: CampaignPolicy;
  summary: string;
  message: string | null;
  description?: string | null;
  tierId: string | null;
  tierName: string | null;
  addonId: string | null;
  addonName: string | null;
  capabilityId: string | null;
  capabilityName: string | null;
  featureKeys: string[];
  payload: unknown;
  diff?: {
    capabilities?: {
      before?: Array<{ id: string; name: string; services: Array<{ key: string; name: string }> }>;
      after?: Array<{ id: string; name: string; services: Array<{ key: string; name: string }> }>;
      added?: Array<{ id: string; name: string; services: Array<{ key: string; name: string }> }>;
      removed?: Array<{ id: string; name: string; services: Array<{ key: string; name: string }> }>;
    };
    services?: {
      capability?: { id: string; name: string,
};
      before?: Array<{ key: string; name: string }>;
      after?: Array<{ key: string; name: string }>;
      added?: Array<{ key: string; name: string }>;
      removed?: Array<{ key: string; name: string }>;
    };
    addons?: {
      before?: Array<{ id: string; name: string; capability: { name: string }; services: Array<{ name: string }> }>;
      after?: Array<{ id: string; name: string; capability: { name: string }; services: Array<{ name: string }> }>;
      added?: Array<{ id: string; name: string; capability: { name: string }; services: Array<{ name: string }> }>;
      removed?: Array<{ id: string; name: string; capability: { name: string }; services: Array<{ name: string }> }>;
    };
    prices?: {
      previousPriceMonthly: number | null;
      priceMonthly: number | null;
      previousPriceYearly: number | null;
      priceYearly: number | null;
    };
  } | null;
  priceChange?: {
    previousPriceMonthly: number | null;
    priceMonthly: number | null;
    previousPriceYearly: number | null;
    priceYearly: number | null;
  } | null;
  effectiveAt: string | null;
  autoForce: boolean;
  pendingCount: number;
  memberCount: number;
  createdAt: string;
  completedAt: string | null;
  groups: CampaignGroup[];
};

export type ListCampaignsFilters = {
  page?: number;
  limit?: number;
  type?: CampaignType;
  status?: CampaignStatus;
  tierId?: string;
};

export function listOperationsCampaigns(filters: ListCampaignsFilters = {}) {
  return api.getPaginated<OperationsCampaign>("platform/operations/campaigns", {
    searchParams: filters,
  });
}

export function getOperationsCampaign(id: string) {
  return api.get<OperationsCampaign>(`platform/operations/campaigns/${id}`);
}

export function notifyOperationsCampaign(
  id: string,
  body: {
    businessIds?: string[];
    message?: string;
    effectiveAt?: string;
  },
) {
  return api.post<{
    notifiedCount: number;
    queued?: number;
    skipped?: number;
    failed?: number;
    skippedCount?: number;
    failedCount?: number;
    campaign: OperationsCampaign;
  }>(`platform/operations/campaigns/${id}/notify`, body);
}

export function extendOperationsCampaign(
  id: string,
  body: {
    businessIds?: string[];
    days?: number;
    effectiveAt?: string;
  },
) {
  return api.post<{
    extendedCount: number;
    effectiveAt: string;
    campaign: OperationsCampaign;
  }>(`platform/operations/campaigns/${id}/extend`, body);
}

export function migrateOperationsCampaign(
  id: string,
  body: {
    businessIds?: string[];
    policy?: CampaignPolicy;
  } = {},
) {
  return api.post<{
    migratedCount: number;
    failureCount: number;
    failures: Array<{ businessId: string; message: string }>;
    campaign: OperationsCampaign;
  }>(`platform/operations/campaigns/${id}/migrate`, body);
}

export function patchOperationsCampaignMembers(
  id: string,
  body: { businessIds: string[]; included: boolean },
) {
  return api.patch<OperationsCampaign>(
    `platform/operations/campaigns/${id}/members`,
    body,
  );
}

export type { PaginatedResult };
