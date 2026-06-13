import { PLATFORM_SUBSCRIPTION_PURPOSE } from '@app/modules/platform/billing/stripe/types/stripe-platform-billing.types';
import { StripeWebhookDispatchService } from './stripe-webhook-dispatch.service';

describe('StripeWebhookDispatchService platform branching', () => {
  const platformHandler = {
    handleEvent: jest.fn().mockResolvedValue(true),
  };

  const service = new StripeWebhookDispatchService(
    {} as never,
    {} as never,
    {} as never,
    { log: jest.fn() } as never,
    {} as never,
    { handleCheckoutSessionCompleted: jest.fn() } as never,
    platformHandler as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes platform checkout to platform handler', async () => {
    await service.dispatchEvent(
      {
        id: 'evt_1',
        type: 'checkout.session.completed',
        livemode: false,
        data: {
          object: {
            metadata: {
              purpose: PLATFORM_SUBSCRIPTION_PURPOSE,
              businessId: 'b1',
            },
          },
        },
      },
      'platform',
    );

    expect(platformHandler.handleEvent).toHaveBeenCalled();
  });

  it('routes invoice events without purpose to connect path when not handled', async () => {
    platformHandler.handleEvent.mockResolvedValueOnce(false);

    await service.dispatchEvent(
      {
        id: 'evt_2',
        type: 'checkout.session.completed',
        livemode: false,
        data: {
          object: {
            metadata: { businessId: 'b1', invoiceId: 'inv_1' },
          },
        },
      },
      'platform',
    );

    expect(platformHandler.handleEvent).not.toHaveBeenCalled();
  });
});
