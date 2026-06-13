import { PLATFORM_SUBSCRIPTION_PURPOSE } from '../types/stripe-platform-billing.types';
import { StripePlatformMetadataService } from './stripe-platform-metadata.service';
import { StripePlatformWebhookHandlerService } from './stripe-platform-webhook-handler.service';

describe('StripePlatformWebhookHandlerService', () => {
  const metadataService = new StripePlatformMetadataService();

  const handler = new StripePlatformWebhookHandlerService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    metadataService,
    {} as never,
    { claim: jest.fn().mockResolvedValue(true) } as never,
  );

  it('detects platform subscription metadata', () => {
    expect(
      handler.isPlatformSubscriptionMetadata({
        purpose: PLATFORM_SUBSCRIPTION_PURPOSE,
        businessId: 'b1',
      }),
    ).toBe(true);
    expect(
      handler.isPlatformSubscriptionMetadata({ purpose: 'invoice_payment' }),
    ).toBe(false);
  });
});

describe('StripePlatformMetadataService', () => {
  const service = new StripePlatformMetadataService();

  it('merges subscription stripe metadata', () => {
    const merged = service.mergeSubscriptionStripeMetadata(
      { stripe: { customerId: 'cus_1' } },
      { subscriptionId: 'sub_1', status: 'active' },
    );

    expect(merged.stripe).toMatchObject({
      customerId: 'cus_1',
      subscriptionId: 'sub_1',
      status: 'active',
      lastSyncedAt: expect.any(String),
    });
  });
});
