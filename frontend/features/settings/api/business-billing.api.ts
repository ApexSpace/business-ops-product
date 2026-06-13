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

export async function createBusinessCheckoutSession(input: {
  planTierId: string;
  billingCycle: "MONTHLY" | "YEARLY";
}): Promise<{ sessionId: string; url: string }> {
  return api.post<{ sessionId: string; url: string }>(
    "businesses/current/billing/stripe/checkout-session",
    input,
  );
}

export async function createBusinessPortalSession(): Promise<{ url: string }> {
  return api.post<{ url: string }>(
    "businesses/current/billing/stripe/portal-session",
  );
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
