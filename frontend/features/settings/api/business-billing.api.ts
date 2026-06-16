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

export async function createBusinessCheckoutSession(input: {
  planGroupId?: string;
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

export interface CancelBusinessSubscriptionResult {
  businessId: string;
  subscriptionId: string;
  status: string;
  billingSource: "STRIPE" | "MANUAL" | "INTERNAL" | "NOT_SELECTED";
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: string | null;
}

export async function cancelBusinessSubscription(
  reason?: string,
): Promise<CancelBusinessSubscriptionResult> {
  return api.post<CancelBusinessSubscriptionResult>(
    "businesses/current/cancel-subscription",
    {
      reason,
    },
  );
}

export async function resumeBusinessSubscription(): Promise<CancelBusinessSubscriptionResult> {
  return api.post<CancelBusinessSubscriptionResult>(
    "businesses/current/billing/stripe/resume-subscription",
  );
}

export type BusinessBillingInvoice = {
  id: string;
  date: string;
  amount: string;
  currency: string;
  status: string;
  description?: string | null;
  billingSource: "STRIPE" | "MANUAL" | "INTERNAL" | "NOT_SELECTED";
  stripeHostedInvoiceUrl?: string | null;
  planGroupName?: string | null;
  planTierName?: string | null;
};

export type BusinessBillingInvoicesResult = {
  items: BusinessBillingInvoice[];
  nextCursor?: string | null;
  hasMore: boolean;
};

export type ListBusinessBillingInvoicesQuery = {
  cursor?: string;
  limit?: number;
};

export function listBusinessBillingInvoices(
  query: ListBusinessBillingInvoicesQuery = {},
) {
  return api.get<BusinessBillingInvoicesResult>(
    "businesses/current/billing/invoices",
    {
      searchParams: query as Record<
        string,
        string | number | boolean | undefined | null
      >,
    },
  );
}
