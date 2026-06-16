import { PLATFORM_SUBSCRIPTION_PURPOSE } from '../types/stripe-platform-billing.types';
import { StripePlatformWebhookHandlerService } from './stripe-platform-webhook-handler.service';

describe('StripePlatformWebhookHandlerService', () => {
  const syncService = {
    isPlatformSubscriptionMetadata: jest.fn(),
    applyStripeCheckoutCompleted: jest.fn(),
    applyStripeSubscriptionCreatedOrUpdated: jest.fn(),
    applyStripeSubscriptionDeleted: jest.fn(),
    recordStripeInvoicePaid: jest.fn(),
    recordStripeInvoicePaymentFailed: jest.fn(),
  };

  const idempotencyService = {
    claim: jest.fn().mockResolvedValue(true),
  };

  const handler = new StripePlatformWebhookHandlerService(
    syncService as never,
    idempotencyService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    idempotencyService.claim.mockResolvedValue(true);
    syncService.isPlatformSubscriptionMetadata.mockImplementation(
      (metadata?: Record<string, string> | null) =>
        metadata?.purpose === PLATFORM_SUBSCRIPTION_PURPOSE,
    );
  });

  it('detects platform subscription metadata', () => {
    syncService.isPlatformSubscriptionMetadata.mockReturnValueOnce(true);
    expect(
      handler.isPlatformSubscriptionMetadata({
        purpose: PLATFORM_SUBSCRIPTION_PURPOSE,
        businessId: 'b1',
      }),
    ).toBe(true);
  });

  it('checkout.session.completed delegates to sync without guarded actions', async () => {
    syncService.applyStripeCheckoutCompleted.mockResolvedValue(true);

    const session = {
      id: 'cs_1',
      customer: 'cus_1',
      subscription: 'sub_1',
      metadata: {
        purpose: PLATFORM_SUBSCRIPTION_PURPOSE,
        businessId: 'biz-1',
        planGroupId: 'group-1',
        planTierId: 'tier-paid',
        billingCycle: 'MONTHLY',
      },
    };

    const handled = await handler.handleEvent({
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: { object: session },
    } as never);

    expect(handled).toBe(true);
    expect(syncService.applyStripeCheckoutCompleted).toHaveBeenCalledWith(
      session,
    );
    expect(
      syncService.applyStripeSubscriptionCreatedOrUpdated,
    ).not.toHaveBeenCalled();
  });

  it('customer.subscription.created delegates to subscription sync', async () => {
    syncService.applyStripeSubscriptionCreatedOrUpdated.mockResolvedValue(true);

    const subscription = {
      id: 'sub_1',
      status: 'active',
      metadata: {
        purpose: PLATFORM_SUBSCRIPTION_PURPOSE,
        businessId: 'biz-1',
        planTierId: 'tier-paid',
      },
    };

    const handled = await handler.handleEvent({
      id: 'evt_sub',
      type: 'customer.subscription.created',
      data: { object: subscription },
    } as never);

    expect(handled).toBe(true);
    expect(
      syncService.applyStripeSubscriptionCreatedOrUpdated,
    ).toHaveBeenCalledWith(subscription, {
      stripeEventId: 'evt_sub',
      stripeEventType: 'customer.subscription.created',
    });
  });

  it('invoice.paid delegates to recordStripeInvoicePaid', async () => {
    syncService.recordStripeInvoicePaid.mockResolvedValue(true);

    const invoice = {
      id: 'in_1',
      subscription: 'sub_1',
      amount_paid: 9900,
      currency: 'usd',
    };

    const handled = await handler.handleEvent({
      id: 'evt_inv',
      type: 'invoice.paid',
      data: { object: invoice },
    } as never);

    expect(handled).toBe(true);
    expect(syncService.recordStripeInvoicePaid).toHaveBeenCalledWith(invoice, {
      stripeEventId: 'evt_inv',
    });
  });

  it('skips duplicate checkout events via idempotency', async () => {
    idempotencyService.claim.mockResolvedValue(false);

    const handled = await handler.handleEvent({
      id: 'evt_dup',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_dup',
          metadata: {
            purpose: PLATFORM_SUBSCRIPTION_PURPOSE,
            businessId: 'biz-1',
            planGroupId: 'g1',
            planTierId: 't1',
            billingCycle: 'MONTHLY',
          },
        },
      },
    } as never);

    expect(handled).toBe(true);
    expect(syncService.applyStripeCheckoutCompleted).not.toHaveBeenCalled();
  });
});
