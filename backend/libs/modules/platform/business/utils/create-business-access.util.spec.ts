import {
  BusinessSubscriptionBillingCycle,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { resolveCreateBusinessAccess } from './create-business-access.util';

describe('resolveCreateBusinessAccess', () => {
  it('maps payment collected to active paid subscription', () => {
    const result = resolveCreateBusinessAccess({
      paymentCollected: true,
      paymentMethod: SubscriptionPaymentMethod.CASH,
      billingCycle: BusinessSubscriptionBillingCycle.MONTHLY,
      amount: 99,
      currentPeriodStart: '2026-06-10',
    });

    expect(result).toMatchObject({
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      paymentStatus: SubscriptionPaymentStatus.PAID,
      paymentMethod: SubscriptionPaymentMethod.CASH,
      recordInitialPayment: true,
      currentPeriodEnd: '2026-07-10',
    });
  });

  it('maps trial access mode', () => {
    const result = resolveCreateBusinessAccess({
      paymentCollected: false,
      unpaidAccessMode: 'TRIAL',
      currentPeriodEnd: '2026-06-24',
    });

    expect(result).toMatchObject({
      subscriptionStatus: SubscriptionStatus.TRIALING,
      paymentStatus: SubscriptionPaymentStatus.NOT_REQUIRED,
      paymentMethod: SubscriptionPaymentMethod.NOT_SELECTED,
      recordInitialPayment: false,
    });
  });

  it('maps pending payment access mode', () => {
    const result = resolveCreateBusinessAccess({
      paymentCollected: false,
      unpaidAccessMode: 'PENDING_PAYMENT',
      currentPeriodEnd: '2026-07-01',
    });

    expect(result).toMatchObject({
      subscriptionStatus: SubscriptionStatus.PENDING_PAYMENT,
      paymentStatus: SubscriptionPaymentStatus.PENDING,
      paymentMethod: SubscriptionPaymentMethod.MANUAL_INVOICE,
    });
  });

  it('maps internal access mode', () => {
    const result = resolveCreateBusinessAccess({
      paymentCollected: false,
      unpaidAccessMode: 'INTERNAL',
    });

    expect(result).toMatchObject({
      subscriptionStatus: SubscriptionStatus.INTERNAL,
      paymentStatus: SubscriptionPaymentStatus.NOT_REQUIRED,
      paymentMethod: SubscriptionPaymentMethod.FREE_INTERNAL,
    });
  });
});
