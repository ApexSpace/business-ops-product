import { PayableType } from '@prisma/client';
import { StripePaymentIntentService } from './stripe-payment-intent.service';

describe('StripePaymentIntentService', () => {
  const stripe = {
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
  };
  const connectContext = {
    resolveTenantStripeChargeContext: jest.fn(),
  };
  const customerService = {
    getOrCreateForContact: jest.fn(),
  };

  const service = new StripePaymentIntentService(
    connectContext as never,
    customerService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    connectContext.resolveTenantStripeChargeContext.mockResolvedValue({
      stripe,
      stripeAccountId: 'acct_connected',
    });
    customerService.getOrCreateForContact.mockResolvedValue({
      stripeCustomerId: 'cus_1',
    });
    stripe.paymentIntents.create.mockResolvedValue({
      id: 'pi_1',
      client_secret: 'secret_1',
      status: 'requires_payment_method',
    });
    stripe.paymentIntents.retrieve.mockResolvedValue({
      id: 'pi_1',
      client_secret: 'secret_1',
      status: 'requires_payment_method',
    });
  });

  it('creates PaymentIntents on the connected account with a collect idempotency key', async () => {
    const result = await service.createForPayment({
      businessId: 'biz-1',
      contactId: 'contact-1',
      amountCents: 5000,
      currency: 'USD',
      description: 'Sale #1',
      paymentId: 'pay-1',
      payableType: PayableType.INVOICE,
      payableId: 'inv-1',
      purpose: 'invoice_collect',
      idempotencyKey: 'close:inv-1:5000',
    });

    expect(result.paymentIntentId).toBe('pi_1');
    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5000,
        customer: 'cus_1',
      }),
      {
        stripeAccount: 'acct_connected',
        idempotencyKey: 'close:inv-1:5000',
      },
    );
  });

  it('retrieves PaymentIntents on the connected account', async () => {
    const result = await service.retrieveForPayment({
      businessId: 'biz-1',
      paymentIntentId: 'pi_1',
    });

    expect(result.clientSecret).toBe('secret_1');
    expect(stripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_1', {
      stripeAccount: 'acct_connected',
    });
  });
});
