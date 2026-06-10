import {
  BusinessStatus,
  BusinessSubscriptionBillingCycle,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { BusinessSubscriptionActionService } from './business-subscription-action.service';
import { BusinessAccessResolverService } from './business-access-resolver.service';
import { BusinessAccessService } from './business-access.service';
import { BusinessEffectiveCapabilitiesService } from './business-effective-capabilities.service';
import { BusinessSubscriptionEventService } from './business-subscription-event.service';
import { BusinessSubscriptionPaymentService } from './business-subscription-payment.service';
import { BusinessSubscriptionActionAvailabilityService } from './business-subscription-action-availability.service';
import { BusinessCapabilitySyncService } from './business-capability-sync.service';

describe('BusinessSubscriptionActionService', () => {
  const prisma = {
    businessSubscription: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        businessSubscription: {
          findUnique: jest.fn().mockResolvedValue({ id: 'sub-1' }),
        },
        planTier: {
          findFirst: jest.fn(),
          findUnique: jest.fn(),
        },
      }),
    ),
  } as unknown as ConstructorParameters<typeof BusinessSubscriptionActionService>[0];

  const beforeState = {
    businessStatus: BusinessStatus.NOT_ACTIVE,
    subscriptionStatus: SubscriptionStatus.PENDING_PAYMENT,
    paymentStatus: SubscriptionPaymentStatus.PENDING,
    accessResolution: {
      canAccessWorkspace: false,
      reasonCode: 'SUBSCRIPTION_PENDING_PAYMENT',
      reasonLabel: 'Payment is pending.',
      warnings: [],
    },
  };

  const afterState = {
    businessStatus: BusinessStatus.ACTIVE,
    subscriptionStatus: SubscriptionStatus.ACTIVE,
    paymentStatus: SubscriptionPaymentStatus.PAID,
    accessResolution: {
      canAccessWorkspace: true,
      reasonCode: 'SUBSCRIPTION_ACTIVE',
      reasonLabel: 'Active subscription.',
      warnings: [],
    },
  };

  const accessService = {
    updateAccessInternal: jest.fn().mockResolvedValue(undefined),
    getAccess: jest.fn().mockResolvedValue({
      businessId: 'b1',
      availableActions: [],
      recommendedAction: null,
    }),
  } as unknown as BusinessAccessService;

  const eventService = {
    captureState: jest
      .fn()
      .mockResolvedValueOnce(beforeState)
      .mockResolvedValue(afterState),
    createCorrelatedEvents: jest.fn().mockResolvedValue([]),
    createEvent: jest.fn().mockResolvedValue({ id: 'evt-1' }),
  } as unknown as BusinessSubscriptionEventService;

  const paymentService = {
    recordPayment: jest.fn().mockResolvedValue({ id: 'pay-1' }),
  } as unknown as BusinessSubscriptionPaymentService;

  const availabilityService = {
    resolveAction: jest.fn().mockReturnValue({
      key: 'MARK_PAID',
      enabled: true,
      visible: true,
      requiresConfirmation: true,
    }),
  } as unknown as BusinessSubscriptionActionAvailabilityService;

  const capabilitySyncService = {} as unknown as BusinessCapabilitySyncService;

  const accessResolver = new BusinessAccessResolverService(
    prisma,
    {
      resolveEffectiveCapabilities: jest.fn().mockResolvedValue([]),
    } as unknown as BusinessEffectiveCapabilitiesService,
  );

  const service = new BusinessSubscriptionActionService(
    prisma,
    accessService,
    accessResolver,
    eventService,
    paymentService,
    availabilityService,
    capabilitySyncService,
  );

  const actor = {
    id: 'user-1',
    email: 'admin@test.com',
    firstName: 'Admin',
    lastName: 'User',
    context: 'platform' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (eventService.captureState as jest.Mock)
      .mockReset()
      .mockResolvedValueOnce(beforeState)
      .mockResolvedValue(afterState);
    (prisma.businessSubscription.findUnique as jest.Mock).mockResolvedValue({
      id: 'sub-1',
      amount: { toString: () => '99' },
      currency: 'USD',
      billingCycle: BusinessSubscriptionBillingCycle.MONTHLY,
      currentPeriodStart: new Date('2026-06-01'),
      currentPeriodEnd: new Date('2026-07-01'),
      planGroup: { currency: 'USD' },
    });
    (prisma.$transaction as jest.Mock).mockImplementation(
      (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          businessSubscription: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'sub-1',
              planTierId: 'tier-old',
              billingCycle: BusinessSubscriptionBillingCycle.MONTHLY,
              amount: { toString: () => '49' },
              currency: 'USD',
              status: SubscriptionStatus.ACTIVE,
            }),
          },
          planTier: {
            findFirst: jest.fn().mockResolvedValue({
              id: 'tier-new',
              planGroupId: 'group-1',
              priceMonthly: { toString: () => '99' },
              priceYearly: { toString: () => '990' },
              setupFee: null,
              trialDays: 14,
              planGroup: { currency: 'USD' },
            }),
            findUnique: jest.fn().mockResolvedValue({
              id: 'tier-old',
              priceMonthly: { toString: () => '49' },
              priceYearly: { toString: () => '490' },
            }),
          },
        }),
    );
    (availabilityService.resolveAction as jest.Mock).mockReturnValue({
      key: 'MARK_PAID',
      enabled: true,
      visible: true,
      requiresConfirmation: true,
    });
  });

  it('previewAction returns before/after access impact', async () => {
    const result = await service.previewAction('b1', {
      actionKey: 'MARK_PAID',
    });

    expect(result.allowed).toBe(true);
    expect(result.beforeState.subscriptionStatus).toBe(
      SubscriptionStatus.PENDING_PAYMENT,
    );
    expect(result.accessImpact.beforeCanAccess).toBe(false);
    expect(result.afterState.subscriptionStatus).toBe(SubscriptionStatus.ACTIVE);
  });

  it('markPaid requires skip reason when skipping payment record', async () => {
    await expect(
      service.markPaid(
        'b1',
        { skipPaymentRecord: true, reason: '', notes: '' },
        actor,
      ),
    ).rejects.toThrow('Reason and notes are required');
  });

  it('markPaid creates payment and events when amount provided', async () => {
    await service.markPaid(
      'b1',
      {
        amount: 99,
        currency: 'USD',
        paymentMethod: SubscriptionPaymentMethod.MANUAL_INVOICE,
      },
      actor,
    );

    expect(accessService.updateAccessInternal).toHaveBeenCalled();
    expect(paymentService.recordPayment).toHaveBeenCalledWith(
      expect.anything(),
      'b1',
      expect.objectContaining({
        amount: 99,
        billingCycle: BusinessSubscriptionBillingCycle.MONTHLY,
      }),
      actor,
    );
    expect(eventService.createCorrelatedEvents).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ paymentId: 'pay-1' }),
      ]),
      actor,
    );
  });

  it('markPaid defaults amount from subscription when omitted', async () => {
    await service.markPaid(
      'b1',
      { paymentMethod: SubscriptionPaymentMethod.MANUAL_INVOICE },
      actor,
    );

    expect(paymentService.recordPayment).toHaveBeenCalledWith(
      expect.anything(),
      'b1',
      expect.objectContaining({ amount: 99, currency: 'USD' }),
      actor,
    );
  });

  it('changePackage updates amount from yearly tier price', async () => {
    (availabilityService.resolveAction as jest.Mock).mockReturnValue({
      key: 'CHANGE_PACKAGE',
      enabled: true,
      visible: true,
      requiresConfirmation: true,
    });

    await service.changePackage(
      'b1',
      {
        planTierId: 'tier-new',
        planGroupId: 'group-1',
        billingCycle: BusinessSubscriptionBillingCycle.YEARLY,
        paymentOption: 'no_payment',
      },
      actor,
    );

    expect(accessService.updateAccessInternal).toHaveBeenCalledWith(
      expect.anything(),
      'b1',
      expect.objectContaining({
        planTierId: 'tier-new',
        billingCycle: BusinessSubscriptionBillingCycle.YEARLY,
        amount: 990,
        currency: 'USD',
      }),
      actor,
      expect.anything(),
    );
  });

  it('changePackage with record payment creates payment row', async () => {
    (availabilityService.resolveAction as jest.Mock).mockReturnValue({
      key: 'CHANGE_PACKAGE',
      enabled: true,
      visible: true,
      requiresConfirmation: true,
    });

    await service.changePackage(
      'b1',
      {
        planTierId: 'tier-new',
        planGroupId: 'group-1',
        billingCycle: BusinessSubscriptionBillingCycle.MONTHLY,
        paymentOption: 'record_payment',
        payment: {
          amount: 99,
          currency: 'USD',
          paymentMethod: SubscriptionPaymentMethod.MANUAL_INVOICE,
          paidAt: '2026-06-10T00:00:00.000Z',
        },
      },
      actor,
    );

    expect(paymentService.recordPayment).toHaveBeenCalled();
    expect(eventService.createCorrelatedEvents).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({
          eventType: 'PAYMENT_MARKED_PAID',
        }),
      ]),
      actor,
    );
  });

  it('changePackage with move pending sets pending statuses', async () => {
    (availabilityService.resolveAction as jest.Mock).mockReturnValue({
      key: 'CHANGE_PACKAGE',
      enabled: true,
      visible: true,
      requiresConfirmation: true,
    });

    await service.changePackage(
      'b1',
      {
        planTierId: 'tier-new',
        planGroupId: 'group-1',
        billingCycle: BusinessSubscriptionBillingCycle.MONTHLY,
        paymentOption: 'move_pending',
      },
      actor,
    );

    expect(accessService.updateAccessInternal).toHaveBeenCalledWith(
      expect.anything(),
      'b1',
      expect.objectContaining({
        subscriptionStatus: SubscriptionStatus.PENDING_PAYMENT,
        paymentStatus: SubscriptionPaymentStatus.PENDING,
        businessStatus: BusinessStatus.NOT_ACTIVE,
      }),
      actor,
      expect.anything(),
    );
  });

  it('cancelSubscription rejects already canceled subscription', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
      fn({
        businessSubscription: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'sub-1',
            status: SubscriptionStatus.CANCELED,
          }),
        },
      }),
    );

    await expect(service.cancelSubscription('b1', actor)).rejects.toThrow(
      'already canceled',
    );
  });
});
