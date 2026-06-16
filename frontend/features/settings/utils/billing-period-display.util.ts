import type { TenantAccessSubscription } from "@/lib/business-access/types";

export interface BillingPeriodEndField {
  label: string;
  date?: string | null;
}

export function resolveScheduledCancelDate(
  subscription?: Pick<
    TenantAccessSubscription,
    "cancelAt" | "currentPeriodEnd"
  > | null,
): string | null | undefined {
  return subscription?.cancelAt ?? subscription?.currentPeriodEnd;
}

function resolveNextBillingDate(
  subscription?: Pick<
    TenantAccessSubscription,
    "nextBillingDate" | "currentPeriodEnd"
  > | null,
): string | null | undefined {
  return subscription?.nextBillingDate ?? subscription?.currentPeriodEnd;
}

/**
 * Resolves the primary end-date row in the business billing period card.
 * Trial dates are only used when the subscription is actually trialing.
 */
export function resolveBillingPeriodEndField(input: {
  subscription?: TenantAccessSubscription | null;
  showTrialLayout: boolean;
  cancellationScheduled: boolean;
}): BillingPeriodEndField {
  const { subscription, showTrialLayout, cancellationScheduled } = input;
  const status = subscription?.status?.toUpperCase();

  if (showTrialLayout) {
    return {
      label: subscription?.nextBillingLabel ?? "Trial ends",
      date: resolveNextBillingDate(subscription),
    };
  }

  if (status === "TRIALING") {
    return {
      label: subscription?.nextBillingLabel ?? "Trial ends",
      date: resolveNextBillingDate(subscription),
    };
  }

  if (cancellationScheduled) {
    return {
      label: "Access until",
      date: resolveScheduledCancelDate(subscription),
    };
  }

  if (status === "ACTIVE") {
    return {
      label: subscription?.nextBillingLabel ?? "Next billing date",
      date: resolveNextBillingDate(subscription),
    };
  }

  if (status === "PENDING_PAYMENT") {
    return {
      label: subscription?.nextBillingLabel ?? "Payment due",
      date: resolveNextBillingDate(subscription),
    };
  }

  return {
    label: subscription?.nextBillingLabel ?? "Current period ends",
    date: resolveNextBillingDate(subscription),
  };
}
