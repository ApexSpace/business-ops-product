import {
  BusinessStatus,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { BusinessSubscriptionActionAvailabilityService } from './business-subscription-action-availability.service';
import { BusinessAccessResolverService } from './business-access-resolver.service';
import { BusinessRepository } from '../repositories/business.repository';

describe('BusinessSubscriptionActionAvailabilityService', () => {
  const prisma = {
    businessSubscription: { findUnique: jest.fn() },
  } as unknown as ConstructorParameters<
    typeof BusinessSubscriptionActionAvailabilityService
  >[0];

  const businessRepository = {
    findById: jest.fn(),
  } as unknown as BusinessRepository;

  const accessResolver = {
    resolveForBusiness: jest.fn().mockResolvedValue({
      canAccessWorkspace: false,
      reasonCode: 'SUBSCRIPTION_PENDING_PAYMENT',
      reasonLabel: 'Payment is pending.',
      warnings: [],
      needsAttention: ['PENDING_PAYMENT'],
      effectiveCapabilities: [],
    }),
  } as unknown as BusinessAccessResolverService;

  const service = new BusinessSubscriptionActionAvailabilityService(
    prisma,
    businessRepository,
    accessResolver,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('recommends MARK_PAID when subscription is pending payment', async () => {
    businessRepository.findById = jest.fn().mockResolvedValue({
      id: 'b1',
      status: BusinessStatus.NOT_ACTIVE,
      snapshotId: 'snap-1',
    });
    prisma.businessSubscription.findUnique = jest.fn().mockResolvedValue({
      status: SubscriptionStatus.PENDING_PAYMENT,
      paymentStatus: SubscriptionPaymentStatus.PENDING,
      planTierId: 'tier-1',
    });

    const result = await service.resolveAvailableActions('b1');

    expect(result.recommendedAction?.key).toBe('MARK_PAID');
    expect(
      result.availableActions.find((a) => a.key === 'MARK_PAID')?.enabled,
    ).toBe(true);
  });

  it('hides cancel when subscription already canceled', () => {
    const action = service.resolveAction('CANCEL_SUBSCRIPTION', {
      businessStatus: BusinessStatus.NOT_ACTIVE,
      subscriptionStatus: SubscriptionStatus.CANCELED,
      paymentStatus: SubscriptionPaymentStatus.NOT_REQUIRED,
    });

    expect(action.visible).toBe(false);
  });

  it('disables sync capabilities without plan tier', () => {
    const action = service.resolveAction('SYNC_CAPABILITIES', {
      businessStatus: BusinessStatus.ACTIVE,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      paymentStatus: SubscriptionPaymentStatus.PAID,
      planTierId: null,
    });

    expect(action.enabled).toBe(false);
    expect(action.disabledReason).toContain('plan tier');
  });
});
