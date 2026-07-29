import { api } from "@/lib/api/client";
import type { PaginatedResult } from "@/features/platform/types";

export type PlatformAddon = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  purchaseMode: "INDEPENDENT" | "DEPENDENT";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isPublic: boolean;
  priceMonthly: string | null;
  priceYearly: string | null;
  staffLimitDelta: number | null;
  locationLimitDelta: number | null;
  capability: { id: string; key: string; name: string; status: string };
  sortOrder: number;
  tierLinks: Array<{
    tierId: string;
    key: string | null;
    name: string;
    status: string;
  }>;
  includedInTiers: Array<{
    tierId: string;
    key: string | null;
    name: string;
    status: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type ListAddonsFilters = {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  purchaseMode?: "INDEPENDENT" | "DEPENDENT";
};

export type AddonSubscriberPolicy =
  | "keep_grandfathered"
  | "force_remove"
  | "convert_to_purchased";

export type AddonImpactPreview = {
  addonId: string;
  addonName: string;
  purchaseMode: "INDEPENDENT" | "DEPENDENT";
  catalogChanged: boolean;
  removedTierIds: string[];
  addedTierIds: string[];
  affectedCount: number;
  businesses: Array<{
    businessId: string;
    businessName: string;
    tierId: string | null;
    tierName: string | null;
    currentlyCovered: boolean;
    stillCovered: boolean;
  }>;
  policies: Record<AddonSubscriberPolicy, string>;
  convertAvailable: boolean;
};

export type AddonSubscribersResponse = {
  addonId: string;
  addonName: string;
  catalogTierIds: string[];
  totals: {
    included: number;
    purchased: number;
    grandfathered: number;
  };
  items: Array<{
    businessId: string;
    businessName: string;
    source: "INCLUDED" | "PURCHASED";
    status: string;
    tierId: string | null;
    tierName: string | null;
    grandfathered: boolean;
    priceAtPurchase: string | null;
    activatedAt: string;
  }>;
};

export async function listPlatformAddons(
  filters: ListAddonsFilters = {},
): Promise<PaginatedResult<PlatformAddon>> {
  const { items, meta } = await api.getPaginated<PlatformAddon>(
    "platform/addons",
    { searchParams: filters },
  );
  return { items, meta };
}

export function getPlatformAddon(id: string) {
  return api.get<PlatformAddon>(`platform/addons/${id}`);
}

export function createPlatformAddon(body: Record<string, unknown>) {
  return api.post<PlatformAddon & { stripeSync?: TierStripeSync }>(
    "platform/addons",
    body,
  );
}

export function updatePlatformAddon(id: string, body: Record<string, unknown>) {
  return api.patch<PlatformAddon & { stripeSync?: TierStripeSync }>(
    `platform/addons/${id}`,
    body,
  );
}

export function syncPlatformAddonStripePrices(id: string) {
  return api.post<PlatformAddon & { stripeSync?: TierStripeSync }>(
    `platform/addons/${id}/stripe-prices/sync`,
  );
}

export type TierStripeSync = {
  synced: boolean;
  stripeConfigured: boolean;
  productId: string | null;
  monthlyPriceId: string | null;
  yearlyPriceId: string | null;
  warnings: string[];
};

export function deletePlatformAddon(id: string) {
  return api.delete<{ success: boolean }>(`platform/addons/${id}`);
}

export function previewAddonImpact(
  id: string,
  body: {
    purchaseMode?: string;
    tierIds?: string[];
    includeInTierIds?: string[];
    priceMonthly?: number;
  },
) {
  return api.post<AddonImpactPreview>(
    `platform/addons/${id}/impact-preview`,
    body,
  );
}

export function listAddonSubscribers(id: string) {
  return api.get<AddonSubscribersResponse>(`platform/addons/${id}/subscribers`);
}

export function migrateAddonSubscribers(
  id: string,
  body: {
    policy: AddonSubscriberPolicy;
    notifyOwners?: boolean;
    notifyEffectiveDate?: string;
    notifyMessage?: string;
    businessIds?: string[];
  },
) {
  return api.post<{
    addonId: string;
    policy: AddonSubscriberPolicy;
    affectedCount: number;
    notifiedCount: number;
  }>(`platform/addons/${id}/migrate-subscribers`, body);
}
