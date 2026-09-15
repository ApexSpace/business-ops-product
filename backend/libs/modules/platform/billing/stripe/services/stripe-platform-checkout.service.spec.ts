import { HttpStatus } from '@nestjs/common';
import { BusinessSubscriptionBillingCycle } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { StripePlatformApiService } from './stripe-platform-api.service';
import { StripePlatformCheckoutService } from './stripe-platform-checkout.service';
import { StripePlatformMetadataService } from './stripe-platform-metadata.service';
import { StripePlatformPlanMappingService } from './stripe-platform-plan-mapping.service';
import { StripePlatformTierPriceSyncService } from './stripe-platform-tier-price-sync.service';

describe('ISO-04 / C-P1-08 public pricing Stripe checkout tenant binding', () => {
  const prisma = {
    business: { findFirst: jest.fn() },
    businessSubscription: { findUnique: jest.fn() },
  } as unknown as jest.Mocked<PrismaService> & {
    business: { findFirst: jest.Mock };
  };

  const stripeApi = {
    getClient: jest.fn(),
  } as unknown as StripePlatformApiService;

  const planMapping = {
    resolvePublishedTierPrice: jest.fn(),
  } as unknown as StripePlatformPlanMappingService;

  const metadataService = {
    parseSubscriptionStripeMetadata: jest.fn(),
  } as unknown as StripePlatformMetadataService;

  const tierPriceSync = {
    assertPriceIdsPresent: jest.fn(),
  } as unknown as StripePlatformTierPriceSyncService;

  const service = new StripePlatformCheckoutService(
    prisma,
    stripeApi,
    planMapping,
    metadataService,
    tierPriceSync,
  );

  const checkoutInput = {
    planGroupId: 'group-1',
    planTierId: 'tier-1',
    billingCycle: BusinessSubscriptionBillingCycle.MONTHLY,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects checkout when there is no authenticated workspace (ISO-04)', async () => {
    await expect(
      service.createPublicCheckoutSession({
        trustedBusinessId: null,
        claimedBusinessId: 'biz-b',
        ...checkoutInput,
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.UNAUTHORIZED,
      status: HttpStatus.UNAUTHORIZED,
    });

    expect(prisma.business.findFirst).not.toHaveBeenCalled();
  });

  it('rejects a spoofed businessId that is not the authenticated workspace (ISO-04)', async () => {
    await expect(
      service.createPublicCheckoutSession({
        trustedBusinessId: 'biz-a',
        claimedBusinessId: 'biz-b',
        ...checkoutInput,
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.FORBIDDEN,
      status: HttpStatus.FORBIDDEN,
    });

    expect(prisma.business.findFirst).not.toHaveBeenCalled();
    expect(stripeApi.getClient).not.toHaveBeenCalled();
  });

  it('ignores omitted claimed businessId and uses the authenticated workspace', () => {
    expect(
      service.resolvePublicCheckoutTenant({
        trustedBusinessId: 'biz-a',
        claimedBusinessId: undefined,
      }),
    ).toBe('biz-a');
  });

  it('accepts claimed businessId only when it matches the authenticated workspace', () => {
    expect(
      service.resolvePublicCheckoutTenant({
        trustedBusinessId: 'biz-a',
        claimedBusinessId: 'biz-a',
      }),
    ).toBe('biz-a');
  });

  it('does not treat empty claimed businessId as a tenant', () => {
    expect(
      service.resolvePublicCheckoutTenant({
        trustedBusinessId: 'biz-a',
        claimedBusinessId: '   ',
      }),
    ).toBe('biz-a');
  });
});

describe('AppException status mapping', () => {
  it('exposes HTTP status on ISO-04 failures', () => {
    const err = new AppException(
      ErrorCode.FORBIDDEN,
      'Checkout business does not match the authenticated workspace',
      HttpStatus.FORBIDDEN,
    );
    expect(err.getStatus()).toBe(HttpStatus.FORBIDDEN);
  });
});
