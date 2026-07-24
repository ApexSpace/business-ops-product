import { SubscriptionStatus } from '@prisma/client';

/**
 * Canonical Stripe → local subscription status + workspace access policy.
 * Backend access resolver, JWT gating, add-on eligibility, and frontend banners
 * must all use this module (or a mirrored copy of the same rules).
 */

export const SUBSCRIPTION_ACTIVE_ACCESS_STATUSES: ReadonlySet<SubscriptionStatus> =
  new Set([
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.TRIALING,
    SubscriptionStatus.PAST_DUE,
    SubscriptionStatus.INTERNAL,
  ]);

export const SUBSCRIPTION_CUTOFF_STATUSES: ReadonlySet<SubscriptionStatus> =
  new Set([
    SubscriptionStatus.UNPAID,
    SubscriptionStatus.CANCELED,
    SubscriptionStatus.INCOMPLETE,
    SubscriptionStatus.PENDING_PAYMENT,
    SubscriptionStatus.EXPIRED,
  ]);

export type StripeSubscriptionStatusString =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | string;

/**
 * Map a Stripe Subscription.status string to our local enum.
 */
export function mapStripeSubscriptionStatus(
  status: StripeSubscriptionStatusString | undefined | null,
): SubscriptionStatus {
  switch (status) {
    case 'active':
      return SubscriptionStatus.ACTIVE;
    case 'trialing':
      return SubscriptionStatus.TRIALING;
    case 'past_due':
      return SubscriptionStatus.PAST_DUE;
    case 'unpaid':
      return SubscriptionStatus.UNPAID;
    case 'canceled':
      return SubscriptionStatus.CANCELED;
    case 'incomplete':
    case 'incomplete_expired':
      return SubscriptionStatus.INCOMPLETE;
    default:
      return SubscriptionStatus.INCOMPLETE;
  }
}

/**
 * Whether the business may use the workspace / purchase add-ons.
 * TRIALING still requires a non-expired currentPeriodEnd when provided.
 */
export function hasActiveSubscriptionAccess(
  status: SubscriptionStatus | null | undefined,
  opts?: { currentPeriodEnd?: Date | null; now?: Date },
): boolean {
  if (!status) return false;
  if (status === SubscriptionStatus.TRIALING) {
    const end = opts?.currentPeriodEnd;
    if (end) {
      const now = opts?.now ?? new Date();
      return end >= now;
    }
    return true;
  }
  return SUBSCRIPTION_ACTIVE_ACCESS_STATUSES.has(status);
}

export function isSubscriptionCutoffStatus(
  status: SubscriptionStatus | null | undefined,
): boolean {
  if (!status) return true;
  return SUBSCRIPTION_CUTOFF_STATUSES.has(status);
}

export type SubscriptionAccessReasonCode =
  | 'SUBSCRIPTION_ACTIVE'
  | 'SUBSCRIPTION_TRIALING'
  | 'TRIAL_EXPIRED'
  | 'SUBSCRIPTION_INTERNAL'
  | 'SUBSCRIPTION_PAST_DUE'
  | 'SUBSCRIPTION_PENDING_PAYMENT'
  | 'SUBSCRIPTION_EXPIRED'
  | 'SUBSCRIPTION_CANCELED'
  | 'SUBSCRIPTION_UNPAID'
  | 'SUBSCRIPTION_INCOMPLETE'
  | 'SUBSCRIPTION_UNKNOWN';

export function resolveSubscriptionAccessReason(
  status: SubscriptionStatus,
  opts?: { currentPeriodEnd?: Date | null; now?: Date },
): { canAccess: boolean; reasonCode: SubscriptionAccessReasonCode } {
  switch (status) {
    case SubscriptionStatus.ACTIVE:
      return { canAccess: true, reasonCode: 'SUBSCRIPTION_ACTIVE' };
    case SubscriptionStatus.TRIALING: {
      const end = opts?.currentPeriodEnd;
      const now = opts?.now ?? new Date();
      if (end && end < now) {
        return { canAccess: false, reasonCode: 'TRIAL_EXPIRED' };
      }
      return { canAccess: true, reasonCode: 'SUBSCRIPTION_TRIALING' };
    }
    case SubscriptionStatus.INTERNAL:
      return { canAccess: true, reasonCode: 'SUBSCRIPTION_INTERNAL' };
    case SubscriptionStatus.PAST_DUE:
      return { canAccess: true, reasonCode: 'SUBSCRIPTION_PAST_DUE' };
    case SubscriptionStatus.PENDING_PAYMENT:
      return { canAccess: false, reasonCode: 'SUBSCRIPTION_PENDING_PAYMENT' };
    case SubscriptionStatus.EXPIRED:
      return { canAccess: false, reasonCode: 'SUBSCRIPTION_EXPIRED' };
    case SubscriptionStatus.CANCELED:
      return { canAccess: false, reasonCode: 'SUBSCRIPTION_CANCELED' };
    case SubscriptionStatus.UNPAID:
      return { canAccess: false, reasonCode: 'SUBSCRIPTION_UNPAID' };
    case SubscriptionStatus.INCOMPLETE:
      return { canAccess: false, reasonCode: 'SUBSCRIPTION_INCOMPLETE' };
    default:
      return { canAccess: false, reasonCode: 'SUBSCRIPTION_UNKNOWN' };
  }
}
