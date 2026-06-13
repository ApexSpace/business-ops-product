import type { BusinessSubscriptionBillingCycle } from '@prisma/client';

export const PLATFORM_SUBSCRIPTION_PURPOSE = 'platform_subscription';

export type PlanTierStripeMetadata = {
  productId?: string;
  monthlyPriceId?: string;
  yearlyPriceId?: string;
};

export type BusinessSubscriptionStripeMetadata = {
  customerId?: string;
  subscriptionId?: string;
  subscriptionItemId?: string;
  priceId?: string;
  productId?: string;
  status?: string;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: string | null;
  canceledAt?: string | null;
  latestInvoiceId?: string | null;
  lastSyncedAt?: string;
};

export type PlatformCheckoutMetadata = {
  purpose: typeof PLATFORM_SUBSCRIPTION_PURPOSE;
  businessId: string;
  planGroupId: string;
  planTierId: string;
  billingCycle: BusinessSubscriptionBillingCycle;
};

export type StripeSubscriptionObject = {
  id?: string;
  customer?: string | { id?: string };
  status?: string;
  cancel_at_period_end?: boolean;
  cancel_at?: number | null;
  canceled_at?: number | null;
  latest_invoice?: string | { id?: string } | null;
  current_period_start?: number;
  current_period_end?: number;
  items?: {
    data?: Array<{
      id?: string;
      price?: { id?: string; product?: string | { id?: string } };
    }>;
  };
  metadata?: Record<string, string>;
};

export type StripeCheckoutSessionObject = {
  id?: string;
  mode?: string;
  customer?: string | null;
  subscription?: string | { id?: string } | null;
  metadata?: Record<string, string>;
  payment_status?: string | null;
};

export type StripeInvoiceObject = {
  id?: string;
  customer?: string | { id?: string };
  subscription?: string | { id?: string } | null;
  amount_paid?: number | null;
  amount_due?: number | null;
  currency?: string | null;
  status?: string | null;
  period_start?: number | null;
  period_end?: number | null;
  metadata?: Record<string, string>;
};
