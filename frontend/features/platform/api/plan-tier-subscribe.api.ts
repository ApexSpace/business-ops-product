import { api } from "@/lib/api/client";

export type SubscribePlanTierInput = {
  planGroupId: string;
  planTierId: string;
  billingCycle: "MONTHLY" | "YEARLY";
};

export type SubscribePlanTierResult = {
  action: "checkout" | "tier_updated";
  sessionId?: string;
  url?: string;
};

export async function subscribeToPlanTier(
  input: SubscribePlanTierInput,
): Promise<SubscribePlanTierResult> {
  return api.post<SubscribePlanTierResult>(
    "businesses/current/billing/subscribe",
    input,
  );
}

export async function createPublicCheckoutSession(
  planGroupId: string,
  input: SubscribePlanTierInput & { businessId: string },
): Promise<SubscribePlanTierResult> {
  return api.post<SubscribePlanTierResult>(
    `public/pricing/${planGroupId}/stripe/checkout-session`,
    input,
  );
}
