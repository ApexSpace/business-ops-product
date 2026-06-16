import {
  SubscriptionBillingSource,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';

export function resolveBillingSourceForSubscriptionUpsert(input: {
  isCreate: boolean;
  status: SubscriptionStatus;
  paymentStatus: SubscriptionPaymentStatus;
  existingBillingSource?: SubscriptionBillingSource | null;
  explicitBillingSource?: SubscriptionBillingSource;
}): SubscriptionBillingSource | undefined {
  const {
    isCreate,
    status,
    paymentStatus,
    existingBillingSource,
    explicitBillingSource,
  } = input;

  if (explicitBillingSource !== undefined) {
    return explicitBillingSource;
  }

  if (isCreate) {
    if (status === SubscriptionStatus.INTERNAL) {
      return SubscriptionBillingSource.INTERNAL;
    }
    if (status === SubscriptionStatus.TRIALING) {
      return SubscriptionBillingSource.NOT_SELECTED;
    }
    if (
      status === SubscriptionStatus.PENDING_PAYMENT ||
      (status === SubscriptionStatus.ACTIVE &&
        paymentStatus === SubscriptionPaymentStatus.PAID)
    ) {
      return SubscriptionBillingSource.MANUAL;
    }
    return SubscriptionBillingSource.NOT_SELECTED;
  }

  if (!existingBillingSource) {
    return undefined;
  }

  if (status === SubscriptionStatus.INTERNAL) {
    return SubscriptionBillingSource.INTERNAL;
  }

  if (
    status === SubscriptionStatus.TRIALING &&
    paymentStatus === SubscriptionPaymentStatus.NOT_REQUIRED
  ) {
    return SubscriptionBillingSource.NOT_SELECTED;
  }

  if (
    existingBillingSource === SubscriptionBillingSource.NOT_SELECTED &&
    (status === SubscriptionStatus.PENDING_PAYMENT ||
      paymentStatus === SubscriptionPaymentStatus.PENDING ||
      (status === SubscriptionStatus.ACTIVE &&
        paymentStatus === SubscriptionPaymentStatus.PAID))
  ) {
    return SubscriptionBillingSource.MANUAL;
  }

  return undefined;
}
