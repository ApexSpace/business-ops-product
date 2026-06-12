import type { PublicPricing } from "@/features/platform/types/plan-group";
import { api } from "@/lib/api/client";

export interface BusinessPlanTierOption {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
}

export interface BusinessPlanOptions {
  pricing: PublicPricing;
  tiers: BusinessPlanTierOption[];
  currentPlanTierId?: string | null;
  currentPlanTierSlug?: string | null;
  currentPlanTierIndex: number;
}

export async function getBusinessPlanOptions(): Promise<BusinessPlanOptions> {
  return api.get<BusinessPlanOptions>("businesses/current/plan-options");
}

export async function changeBusinessPlanTier(planTierId: string): Promise<void> {
  await api.post<void>("businesses/current/change-plan-tier", { planTierId });
}

export async function cancelBusinessSubscription(
  reason?: string,
): Promise<void> {
  await api.post<void>("businesses/current/cancel-subscription", {
    reason,
  });
}
