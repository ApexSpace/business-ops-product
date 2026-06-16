import {
  SubscriptionBillingSource,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { resolveBillingSourceForSubscriptionUpsert } from './resolve-billing-source.util';

describe('resolveBillingSourceForSubscriptionUpsert', () => {
  it('sets NOT_SELECTED for new trialing subscriptions', () => {
    expect(
      resolveBillingSourceForSubscriptionUpsert({
        isCreate: true,
        status: SubscriptionStatus.TRIALING,
        paymentStatus: SubscriptionPaymentStatus.NOT_REQUIRED,
      }),
    ).toBe(SubscriptionBillingSource.NOT_SELECTED);
  });

  it('sets INTERNAL for new internal subscriptions', () => {
    expect(
      resolveBillingSourceForSubscriptionUpsert({
        isCreate: true,
        status: SubscriptionStatus.INTERNAL,
        paymentStatus: SubscriptionPaymentStatus.NOT_REQUIRED,
      }),
    ).toBe(SubscriptionBillingSource.INTERNAL);
  });

  it('sets MANUAL for paid active subscriptions', () => {
    expect(
      resolveBillingSourceForSubscriptionUpsert({
        isCreate: true,
        status: SubscriptionStatus.ACTIVE,
        paymentStatus: SubscriptionPaymentStatus.PAID,
      }),
    ).toBe(SubscriptionBillingSource.MANUAL);
  });

  it('converts NOT_SELECTED to MANUAL when marking paid', () => {
    expect(
      resolveBillingSourceForSubscriptionUpsert({
        isCreate: false,
        status: SubscriptionStatus.ACTIVE,
        paymentStatus: SubscriptionPaymentStatus.PAID,
        existingBillingSource: SubscriptionBillingSource.NOT_SELECTED,
      }),
    ).toBe(SubscriptionBillingSource.MANUAL);
  });

  it('restores NOT_SELECTED when returning to trialing', () => {
    expect(
      resolveBillingSourceForSubscriptionUpsert({
        isCreate: false,
        status: SubscriptionStatus.TRIALING,
        paymentStatus: SubscriptionPaymentStatus.NOT_REQUIRED,
        existingBillingSource: SubscriptionBillingSource.MANUAL,
      }),
    ).toBe(SubscriptionBillingSource.NOT_SELECTED);
  });
});
