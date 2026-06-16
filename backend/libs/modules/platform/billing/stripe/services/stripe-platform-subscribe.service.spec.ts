import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { StripePlatformSubscribeService } from './stripe-platform-subscribe.service';

describe('StripePlatformSubscribeService', () => {
  const prisma = {
    business: { findFirst: jest.fn() },
    businessSubscription: { findUnique: jest.fn() },
  } as never;

  const planMapping = {
    resolvePublishedTierPrice: jest.fn(),
  } as never;

  const metadataService = {
    parseSubscriptionStripeMetadata: jest.fn(),
  } as never;

  const checkoutService = {
    createCheckoutSession: jest.fn(),
    resolveActiveOwnerEmail: jest.fn(),
  } as never;

  const subscriptionService = {
    updateSubscriptionTier: jest.fn(),
  } as never;

  const subscriptionActionService = {
    changePackage: jest.fn(),
  } as never;

  const service = new StripePlatformSubscribeService(
    prisma,
    planMapping,
    metadataService,
    checkoutService,
    subscriptionService,
    subscriptionActionService,
  );

  const baseInput = {
    businessId: 'biz-1',
    planGroupId: 'group-1',
    planTierId: 'tier-2',
    billingCycle: 'MONTHLY' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.business.findFirst as jest.Mock).mockResolvedValue({ id: 'biz-1' });
    (planMapping.resolvePublishedTierPrice as jest.Mock).mockResolvedValue({
      priceId: 'price_m',
    });
    (prisma.businessSubscription.findUnique as jest.Mock).mockResolvedValue(
      null,
    );
    (checkoutService.createCheckoutSession as jest.Mock).mockResolvedValue({
      sessionId: 'cs_1',
      url: 'https://checkout.stripe.test/session',
    });
    (checkoutService.resolveActiveOwnerEmail as jest.Mock).mockResolvedValue(
      'owner@test.com',
    );
  });

  it('creates checkout when workspace has no Stripe subscription', async () => {
    const result = await service.subscribeToPlanTier(baseInput);

    expect(result).toEqual({
      action: 'checkout',
      sessionId: 'cs_1',
      url: 'https://checkout.stripe.test/session',
    });
    expect(checkoutService.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining(baseInput),
    );
    expect(checkoutService.resolveActiveOwnerEmail).not.toHaveBeenCalled();
  });

  it('uses owner email when actor initiates checkout', async () => {
    const actor = {
      id: 'user-1',
      email: 'admin@test.com',
      context: 'business' as const,
    };

    const result = await service.subscribeToPlanTier({ ...baseInput, actor });

    expect(result).toEqual({
      action: 'checkout',
      sessionId: 'cs_1',
      url: 'https://checkout.stripe.test/session',
    });
    expect(checkoutService.resolveActiveOwnerEmail).toHaveBeenCalledWith(
      'biz-1',
    );
    expect(checkoutService.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        ...baseInput,
        customerEmail: 'owner@test.com',
      }),
    );
  });

  it('throws when Stripe price mapping is missing', async () => {
    (planMapping.resolvePublishedTierPrice as jest.Mock).mockRejectedValue(
      new AppException(
        ErrorCode.MISSING_STRIPE_MAPPING,
        'This plan is not connected to Stripe yet.',
      ),
    );

    await expect(service.subscribeToPlanTier(baseInput)).rejects.toMatchObject({
      code: ErrorCode.MISSING_STRIPE_MAPPING,
    });
  });

  it('throws when already on the selected tier for an active subscription', async () => {
    (prisma.businessSubscription.findUnique as jest.Mock).mockResolvedValue({
      planGroupId: 'group-1',
      planTierId: 'tier-2',
      billingSource: 'STRIPE',
      status: 'ACTIVE',
      metadata: {},
    });

    await expect(service.subscribeToPlanTier(baseInput)).rejects.toMatchObject({
      code: ErrorCode.ALREADY_ON_TIER,
    });
  });

  it('creates checkout when canceled subscription re-subscribes to the same tier', async () => {
    (prisma.businessSubscription.findUnique as jest.Mock).mockResolvedValue({
      planGroupId: 'group-1',
      planTierId: 'tier-2',
      billingSource: 'STRIPE',
      status: 'CANCELED',
      metadata: { stripe: { subscriptionId: 'sub_old' } },
    });
    (
      metadataService.parseSubscriptionStripeMetadata as jest.Mock
    ).mockReturnValue({ subscriptionId: 'sub_old' });

    const result = await service.subscribeToPlanTier(baseInput);

    expect(result).toEqual({
      action: 'checkout',
      sessionId: 'cs_1',
      url: 'https://checkout.stripe.test/session',
    });
    expect(checkoutService.createCheckoutSession).toHaveBeenCalled();
    expect(subscriptionService.updateSubscriptionTier).not.toHaveBeenCalled();
  });

  it('updates Stripe subscription when one is already linked', async () => {
    (prisma.businessSubscription.findUnique as jest.Mock).mockResolvedValue({
      planGroupId: 'group-1',
      planTierId: 'tier-1',
      billingSource: 'STRIPE',
      status: 'ACTIVE',
      metadata: { stripe: { subscriptionId: 'sub_1' } },
    });
    (
      metadataService.parseSubscriptionStripeMetadata as jest.Mock
    ).mockReturnValue({ subscriptionId: 'sub_1', subscriptionItemId: 'si_1' });

    const result = await service.subscribeToPlanTier(baseInput);

    expect(result).toEqual({ action: 'tier_updated' });
    expect(subscriptionService.updateSubscriptionTier).toHaveBeenCalledWith({
      businessId: 'biz-1',
      planGroupId: 'group-1',
      planTierId: 'tier-2',
      billingCycle: 'MONTHLY',
    });
  });

  it('uses changePackage when actor is present on Stripe upgrade', async () => {
    const actor = {
      id: 'user-1',
      email: 'a@test.com',
      context: 'business' as const,
    };
    (prisma.businessSubscription.findUnique as jest.Mock).mockResolvedValue({
      planGroupId: 'group-1',
      planTierId: 'tier-1',
      billingSource: 'STRIPE',
      status: 'ACTIVE',
      metadata: { stripe: { subscriptionId: 'sub_1' } },
    });
    (
      metadataService.parseSubscriptionStripeMetadata as jest.Mock
    ).mockReturnValue({ subscriptionId: 'sub_1', subscriptionItemId: 'si_1' });

    const result = await service.subscribeToPlanTier({ ...baseInput, actor });

    expect(result).toEqual({ action: 'tier_updated' });
    expect(subscriptionActionService.changePackage).toHaveBeenCalled();
    expect(subscriptionService.updateSubscriptionTier).not.toHaveBeenCalled();
  });

  it('throws when manual billing change is attempted without actor', async () => {
    (prisma.businessSubscription.findUnique as jest.Mock).mockResolvedValue({
      planGroupId: 'group-1',
      planTierId: 'tier-1',
      billingSource: 'MANUAL',
      status: 'ACTIVE',
      metadata: {},
    });

    await expect(service.subscribeToPlanTier(baseInput)).rejects.toMatchObject({
      code: ErrorCode.MANUAL_BILLING_PLAN_CHANGE,
    });
  });
});
