import { api } from "@/lib/api/client";
import type { PaginatedResult } from "@/features/platform/types";

export type TierStripeIds = {
  productId: string | null;
  monthlyPriceId: string | null;
  yearlyPriceId: string | null;
};

export type TierStripeSync = {
  synced: boolean;
  stripeConfigured: boolean;
  productId: string | null;
  monthlyPriceId: string | null;
  yearlyPriceId: string | null;
  monthlyMatched: boolean | null;
  yearlyMatched: boolean | null;
  monthlyUnitAmount: number | null;
  yearlyUnitAmount: number | null;
  catalogMonthlyCents: number | null;
  catalogYearlyCents: number | null;
  createdMonthlyPrice: boolean;
  createdYearlyPrice: boolean;
  warnings: string[];
};

export type PlatformTier = {
  id: string;
  key: string | null;
  slug: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isPublic: boolean;
  priceMonthly: string | null;
  priceYearly: string | null;
  setupFee: string | null;
  trialDays: number | null;
  staffLimit: number | null;
  locationLimit: number | null;
  currency: string;
  sortOrder: number;
  stripe?: TierStripeIds;
  stripeSync?: TierStripeSync;
  capabilities: Array<{
    id: string;
    key: string;
    name: string;
    status: string;
    sortOrder: number;
  }>;
  includedAddons: Array<{
    id: string;
    key: string;
    name: string;
    purchaseMode: string;
    status: string;
    priceMonthly: string | null;
  }>;
  dependentAddons: Array<{
    id: string;
    key: string;
    name: string;
    purchaseMode: string;
    status: string;
  }>;
  versions: Array<{
    id: string;
    version: number;
    priceMonthly: string | null;
    priceYearly: string | null;
    staffLimit: number | null;
    locationLimit: number | null;
    publishedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type ListTiersFilters = {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  isPublic?: boolean;
};

export async function listPlatformTiers(
  filters: ListTiersFilters = {},
): Promise<PaginatedResult<PlatformTier>> {
  const { items, meta } = await api.getPaginated<PlatformTier>("platform/tiers", {
    searchParams: filters,
  });
  return { items, meta,
};
}

export function getPlatformTier(id: string) {
  return api.get<PlatformTier>(`platform/tiers/${id}`);
}

export function createPlatformTier(body: Record<string, unknown>) {
  return api.post<PlatformTier>("platform/tiers", body);
}

export function updatePlatformTier(id: string, body: Record<string, unknown>) {
  return api.patch<PlatformTier>(`platform/tiers/${id}`, body);
}

export function deletePlatformTier(id: string) {
  return api.delete<{ success: boolean }>(`platform/tiers/${id}`);
}

export function publishPlatformTierVersion(
  id: string,
  body: { mode?: string; reason?: string } = {},
) {
  return api.post<PlatformTier>(`platform/tiers/${id}/publish-version`, body);
}

export function getPlatformTierStripeSync(id: string) {
  return api.get<TierStripeSync>(`platform/tiers/${id}/stripe-sync`);
}

export function syncPlatformTierStripePrices(id: string) {
  return api.post<PlatformTier>(`platform/tiers/${id}/stripe-sync`);
}
