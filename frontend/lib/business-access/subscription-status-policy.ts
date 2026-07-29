/**
 * Mirrors backend subscription-status.policy.ts access rules.
 * Keep in sync when changing Stripe → local status mapping or access matrix.
 */

export type SubscriptionAccessStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PENDING_PAYMENT"
  | "CANCELED"
  | "EXPIRED"
  | "INTERNAL"
  | "PAST_DUE"
  | "UNPAID"
  | "INCOMPLETE";

export const SUBSCRIPTION_ACTIVE_ACCESS_STATUSES = new Set<SubscriptionAccessStatus>([
  "ACTIVE",
  "TRIALING",
  "PAST_DUE",
  "INTERNAL",
]);

export function hasActiveSubscriptionAccess(
  status: SubscriptionAccessStatus | null | undefined,
  opts?: { currentPeriodEnd?: string | Date | null; now?: Date },
): boolean {
  if (!status) return false;
  if (status === "TRIALING") {
    const end = opts?.currentPeriodEnd;
    if (end) {
      const now = opts?.now ?? new Date();
      return new Date(end) >= now;
    }
    return true;
  }
  return SUBSCRIPTION_ACTIVE_ACCESS_STATUSES.has(status);
}

export type SubscriptionAccessReasonCode =
  | "SUBSCRIPTION_ACTIVE"
  | "SUBSCRIPTION_TRIALING"
  | "TRIAL_EXPIRED"
  | "SUBSCRIPTION_INTERNAL"
  | "SUBSCRIPTION_PAST_DUE"
  | "SUBSCRIPTION_PENDING_PAYMENT"
  | "SUBSCRIPTION_EXPIRED"
  | "SUBSCRIPTION_CANCELED"
  | "SUBSCRIPTION_UNPAID"
  | "SUBSCRIPTION_INCOMPLETE"
  | "SUBSCRIPTION_UNKNOWN";

export function resolveSubscriptionAccessReason(
  status: SubscriptionAccessStatus,
  opts?: { currentPeriodEnd?: string | Date | null; now?: Date },
): { canAccess: boolean; reasonCode: SubscriptionAccessReasonCode } {
  switch (status) {
    case "ACTIVE":
      return { canAccess: true, reasonCode: "SUBSCRIPTION_ACTIVE" };
    case "TRIALING": {
      const end = opts?.currentPeriodEnd;
      const now = opts?.now ?? new Date();
      if (end && new Date(end) < now) {
        return { canAccess: false, reasonCode: "TRIAL_EXPIRED" };
      }
      return { canAccess: true, reasonCode: "SUBSCRIPTION_TRIALING" };
    }
    case "INTERNAL":
      return { canAccess: true, reasonCode: "SUBSCRIPTION_INTERNAL" };
    case "PAST_DUE":
      return { canAccess: true, reasonCode: "SUBSCRIPTION_PAST_DUE" };
    case "PENDING_PAYMENT":
      return { canAccess: false, reasonCode: "SUBSCRIPTION_PENDING_PAYMENT" };
    case "EXPIRED":
      return { canAccess: false, reasonCode: "SUBSCRIPTION_EXPIRED" };
    case "CANCELED":
      return { canAccess: false, reasonCode: "SUBSCRIPTION_CANCELED" };
    case "UNPAID":
      return { canAccess: false, reasonCode: "SUBSCRIPTION_UNPAID" };
    case "INCOMPLETE":
      return { canAccess: false, reasonCode: "SUBSCRIPTION_INCOMPLETE" };
    default:
      return { canAccess: false, reasonCode: "SUBSCRIPTION_UNKNOWN" };
  }
}
