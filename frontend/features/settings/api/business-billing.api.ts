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

export async function createBusinessSetupIntent(): Promise<{
  clientSecret: string;
  publishableKey: string | null;
}> {
  return api.post<{ clientSecret: string; publishableKey: string | null }>(
    "businesses/current/billing/setup-intent",
  );
}

export async function confirmBusinessSetupIntent(
  setupIntentId: string,
): Promise<
  Array<{
    id: string;
    brand: string | null;
    last4: string | null;
    expMonth: number | null;
    expYear: number | null;
    isDefault: boolean;
  }>
> {
  return api.post("businesses/current/billing/setup-intent/confirm", {
    setupIntentId,
  });
}

export async function listBusinessPaymentMethods(): Promise<
  Array<{
    id: string;
    brand: string | null;
    last4: string | null;
    expMonth: number | null;
    expYear: number | null;
    isDefault: boolean;
  }>
> {
  return api.get("businesses/current/billing/payment-methods");
}

export async function previewBusinessTierChange(tierId: string) {
  return api.post<{
    blocked: boolean;
    blockReason: string | null;
    lostDependentAddons: Array<{ id: string; key: string; name: string }>;
    staffUsed: number;
    staffLimit: number | null;
    locationUsed: number;
    locationLimit: number | null;
    stripe: {
      direction: "upgrade" | "downgrade" | "same";
      currentTierName: string;
      targetTierName: string;
      addonsRemovedImmediately: Array<{ id: string; name: string }>;
      addonsDroppedAtPeriodEnd: Array<{ id: string; name: string }>;
      currentPeriodEnd: string | null;
    } | null;
  }>("businesses/current/preview-tier-change", { tierId });
}

export async function changeBusinessPlanTier(planTierId: string): Promise<{
  requested?: boolean;
  preview?: {
    direction: "upgrade" | "downgrade" | "same";
    addonsRemovedImmediately: Array<{ id: string; name: string }>;
    addonsDroppedAtPeriodEnd: Array<{ id: string; name: string }>;
    currentPeriodEnd: string | null;
  };
}> {
  return api.post("businesses/current/change-plan-tier", { planTierId });
}

export async function cancelBusinessSubscription(
  reason?: string,
): Promise<void> {
  await api.post<void>("businesses/current/cancel-subscription", {
    reason,
  });
}
