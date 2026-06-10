import { BusinessStatus, SubscriptionPaymentStatus, SubscriptionStatus } from '@prisma/client';
import { BusinessAccessResolverService } from './business-access-resolver.service';
import { BusinessEffectiveCapabilitiesService } from './business-effective-capabilities.service';

describe('BusinessAccessResolverService', () => {
  const prisma = {
    business: { findFirst: jest.fn() },
    businessMembership: { findFirst: jest.fn() },
  } as unknown as ConstructorParameters<typeof BusinessAccessResolverService>[0];

  const effectiveCapabilitiesService = {
    resolveEffectiveCapabilities: jest.fn().mockResolvedValue([]),
  } as unknown as BusinessEffectiveCapabilitiesService;

  const service = new BusinessAccessResolverService(
    prisma,
    effectiveCapabilitiesService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('grants access for active business with active subscription', () => {
    const result = service.resolve({
      businessId: 'b1',
      businessStatus: BusinessStatus.ACTIVE,
      capabilities: [{ key: 'crm', name: 'CRM' }],
      subscription: {
        status: SubscriptionStatus.ACTIVE,
        planTierId: 'tier-1',
        paymentStatus: SubscriptionPaymentStatus.PAID,
      },
    });

    expect(result.canAccessWorkspace).toBe(true);
    expect(result.reasonCode).toBe('SUBSCRIPTION_ACTIVE');
  });

  it('denies access when trial expired', () => {
    const result = service.resolve({
      businessId: 'b1',
      businessStatus: BusinessStatus.ACTIVE,
      capabilities: [{ key: 'crm', name: 'CRM' }],
      subscription: {
        status: SubscriptionStatus.TRIALING,
        planTierId: 'tier-1',
        paymentStatus: SubscriptionPaymentStatus.NOT_REQUIRED,
        currentPeriodEnd: new Date('2020-01-01'),
      },
    });

    expect(result.canAccessWorkspace).toBe(false);
    expect(result.reasonCode).toBe('TRIAL_EXPIRED');
    expect(result.needsAttention).toContain('TRIAL_EXPIRED');
  });

  it('flags no plan tier for non-internal subscriptions', () => {
    const result = service.resolve({
      businessId: 'b1',
      businessStatus: BusinessStatus.ACTIVE,
      capabilities: [],
      subscription: {
        status: SubscriptionStatus.ACTIVE,
        planTierId: null,
        paymentStatus: SubscriptionPaymentStatus.PAID,
      },
    });

    expect(result.needsAttention).toContain('NO_PLAN_TIER');
    expect(result.needsAttention).toContain('NO_CAPABILITIES');
  });
});
