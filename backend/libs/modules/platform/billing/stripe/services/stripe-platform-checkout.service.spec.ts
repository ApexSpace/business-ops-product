import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { StripePlatformCheckoutService } from './stripe-platform-checkout.service';

describe('StripePlatformCheckoutService', () => {
  const prisma = {
    business: { findFirst: jest.fn() },
    businessMembership: { findFirst: jest.fn() },
    businessSubscription: { findUnique: jest.fn(), update: jest.fn() },
  } as never;

  const stripeApi = {
    getClient: jest.fn(),
  } as never;

  const planMapping = {
    resolvePublishedTierPrice: jest.fn(),
  } as never;

  const metadataService = {
    parseSubscriptionStripeMetadata: jest.fn(),
    mergeSubscriptionStripeMetadata: jest.fn((existing, patch) => ({
      stripe: { ...(existing?.stripe ?? {}), ...patch },
    })),
  } as never;

  const service = new StripePlatformCheckoutService(
    prisma,
    stripeApi,
    planMapping,
    metadataService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FRONTEND_URL = 'https://app.test';
  });

  describe('resolveActiveOwnerEmail', () => {
    it('returns active owner email', async () => {
      (prisma.businessMembership.findFirst as jest.Mock).mockResolvedValue({
        user: { email: 'owner@test.com' },
      });

      await expect(service.resolveActiveOwnerEmail('biz-1')).resolves.toBe(
        'owner@test.com',
      );
    });

    it('throws when no active owner is set', async () => {
      (prisma.businessMembership.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.resolveActiveOwnerEmail('biz-1')).rejects.toMatchObject(
        {
          code: ErrorCode.BUSINESS_OWNER_REQUIRED,
        },
      );
    });
  });

  describe('createCheckoutSessionForCurrentBusiness', () => {
    const stripeCreate = jest.fn();

    beforeEach(() => {
      (prisma.businessMembership.findFirst as jest.Mock).mockResolvedValue({
        user: { email: 'owner@test.com' },
      });
      (prisma.businessSubscription.findUnique as jest.Mock).mockResolvedValue({
        planGroupId: 'group-1',
      });
      (prisma.business.findFirst as jest.Mock).mockResolvedValue({
        id: 'biz-1',
        name: 'Test Biz',
      });
      (planMapping.resolvePublishedTierPrice as jest.Mock).mockResolvedValue({
        priceId: 'price_1',
      });
      (metadataService.parseSubscriptionStripeMetadata as jest.Mock).mockReturnValue(
        null,
      );
      stripeCreate.mockResolvedValue({
        id: 'cs_1',
        url: 'https://checkout.stripe.test/session',
      });
      (stripeApi.getClient as jest.Mock).mockReturnValue({
        checkout: { sessions: { create: stripeCreate } },
      });
    });

    it('uses owner email for Stripe checkout', async () => {
      await service.createCheckoutSessionForCurrentBusiness('biz-1', {
        planTierId: 'tier-1',
        billingCycle: 'MONTHLY',
      });

      expect(stripeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_email: 'owner@test.com',
        }),
      );
    });

    it('throws before Stripe when owner is missing', async () => {
      (prisma.businessMembership.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.createCheckoutSessionForCurrentBusiness('biz-1', {
          planTierId: 'tier-1',
          billingCycle: 'MONTHLY',
        }),
      ).rejects.toBeInstanceOf(AppException);

      expect(stripeCreate).not.toHaveBeenCalled();
    });

    it('stores pending checkout metadata without changing billing source', async () => {
      const trialSubscription = {
        businessId: 'biz-1',
        planGroupId: 'group-1',
        planTierId: 'tier-trial',
        billingSource: 'NOT_SELECTED',
        status: 'TRIALING',
        billingCycle: 'MONTHLY',
        metadata: {},
      };
      (prisma.businessSubscription.findUnique as jest.Mock).mockResolvedValue(
        trialSubscription,
      );

      await service.createCheckoutSessionForCurrentBusiness('biz-1', {
        planTierId: 'tier-1',
        billingCycle: 'MONTHLY',
      });

      expect(prisma.businessSubscription.update).toHaveBeenCalledWith({
        where: { businessId: 'biz-1' },
        data: {
          metadata: expect.objectContaining({
            stripe: expect.objectContaining({
              pendingCheckoutSessionId: 'cs_1',
              pendingPlanGroupId: 'group-1',
              pendingPlanTierId: 'tier-1',
              pendingBillingCycle: 'MONTHLY',
              checkoutStartedAt: expect.any(String),
            }),
          }),
        },
      });
      const updateCall = (prisma.businessSubscription.update as jest.Mock).mock
        .calls[0][0];
      expect(updateCall.data).not.toHaveProperty('billingSource');
      expect(updateCall.data).not.toHaveProperty('planTierId');
      expect(updateCall.data).not.toHaveProperty('status');
    });

    it('does not update subscription when none exists', async () => {
      (prisma.businessSubscription.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await service.createCheckoutSession({
        businessId: 'biz-1',
        planGroupId: 'group-1',
        planTierId: 'tier-1',
        billingCycle: 'MONTHLY',
      });

      expect(prisma.businessSubscription.update).not.toHaveBeenCalled();
    });
  });
});
