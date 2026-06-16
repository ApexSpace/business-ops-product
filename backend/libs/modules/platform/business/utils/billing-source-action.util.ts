import { SubscriptionBillingSource } from '@prisma/client';
import type { SubscriptionActionKey } from '../types/subscription-action.types';

export const STRIPE_MANAGED_MESSAGE =
  'This subscription is managed by Stripe. Use Stripe billing actions instead.';

export const STRIPE_ONLY_ACTION_KEYS: SubscriptionActionKey[] = [
  'OPEN_STRIPE_PORTAL',
  'RESYNC_FROM_STRIPE',
];

export const MANUAL_PAYMENT_ACTION_KEYS: SubscriptionActionKey[] = [
  'MARK_PAID',
  'RECORD_PAYMENT',
  'MOVE_PENDING',
];

export const MANUAL_BILLING_ACTION_KEYS: SubscriptionActionKey[] = [
  ...MANUAL_PAYMENT_ACTION_KEYS,
  'EXTEND_TRIAL',
  'EXPIRE_TRIAL',
  'MANUAL_ADJUSTMENT',
];

export const INTERNAL_OPERATIONAL_ACTION_KEYS: SubscriptionActionKey[] = [
  'CHANGE_PACKAGE',
  'CHANGE_SNAPSHOT',
  'SYNC_CAPABILITIES',
  'SUSPEND_BUSINESS',
  'REACTIVATE_BUSINESS',
];

export const STRIPE_CONTROLLED_PATCH_FIELDS = [
  'subscriptionStatus',
  'paymentStatus',
  'paymentMethod',
  'amount',
  'currency',
  'billingCycle',
  'currentPeriodStart',
  'currentPeriodEnd',
] as const;

export type StripeControlledPatchField =
  (typeof STRIPE_CONTROLLED_PATCH_FIELDS)[number];

export function isManualBillingAction(
  actionKey: SubscriptionActionKey,
): boolean {
  return MANUAL_BILLING_ACTION_KEYS.includes(actionKey);
}

export function isStripeOnlyAction(actionKey: SubscriptionActionKey): boolean {
  return STRIPE_ONLY_ACTION_KEYS.includes(actionKey);
}

export function assertManualBillingAllowed(
  billingSource: SubscriptionBillingSource | null | undefined,
): void {
  if (billingSource === SubscriptionBillingSource.STRIPE) {
    throw new Error(STRIPE_MANAGED_MESSAGE);
  }
}

export function getStripeControlledFieldsInUpdate(
  dto: Record<string, unknown>,
): StripeControlledPatchField[] {
  return STRIPE_CONTROLLED_PATCH_FIELDS.filter(
    (field) => dto[field] !== undefined,
  );
}

export function isActionVisibleForBillingSource(
  actionKey: SubscriptionActionKey,
  billingSource: SubscriptionBillingSource | null | undefined,
): boolean {
  const source = billingSource ?? SubscriptionBillingSource.NOT_SELECTED;

  if (source === SubscriptionBillingSource.NOT_SELECTED) {
    if (MANUAL_PAYMENT_ACTION_KEYS.includes(actionKey)) return false;
    if (isStripeOnlyAction(actionKey)) return false;
    if (actionKey === 'MANUAL_ADJUSTMENT') return false;
    return true;
  }

  if (source === SubscriptionBillingSource.STRIPE) {
    if (isManualBillingAction(actionKey)) return false;
    return true;
  }

  if (source === SubscriptionBillingSource.MANUAL) {
    if (isStripeOnlyAction(actionKey)) return false;
    return true;
  }

  if (source === SubscriptionBillingSource.INTERNAL) {
    if (
      isManualBillingAction(actionKey) ||
      isStripeOnlyAction(actionKey) ||
      actionKey === 'RECORD_PAYMENT' ||
      actionKey === 'CANCEL_SUBSCRIPTION' ||
      actionKey === 'EXPIRE_TRIAL' ||
      actionKey === 'EXTEND_TRIAL' ||
      actionKey === 'MOVE_PENDING' ||
      actionKey === 'MARK_PAID'
    ) {
      return INTERNAL_OPERATIONAL_ACTION_KEYS.includes(actionKey);
    }
    return INTERNAL_OPERATIONAL_ACTION_KEYS.includes(actionKey);
  }

  return true;
}
