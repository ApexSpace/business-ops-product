import { PayableType } from '@prisma/client';
import { StripePaymentIntentService } from './stripe-payment-intent.service';

describe('StripePaymentIntentService', () => {
  const chargeCtx = {
    stripe: {
      paymentIntents: {
        create: jest.fn(),
        cancel: jest.fn().mockResolvedValue({ id: 'pi_1', status: 'canceled' }),
      },
    },
    stripeAccountId: 'acct_connected',
  };
  const connectContext = {
    resolveTenantStripeChargeContext: jest.fn().mockResolvedValue(chargeCtx),
  };
  const customerService = {
    getOrCreateForContact: jest.fn().mockResolvedValue({
      stripeCustomerId: 'cus_1',
    }),
  };

  const service = new StripePaymentIntentService(
    connectContext as never,
    customerService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    connectContext.resolveTenantStripeChargeContext.mockResolvedValue(chargeCtx);
    chargeCtx.stripe.paymentIntents.cancel.mockResolvedValue({
      id: 'pi_1',
      status: 'canceled',
    });
  });

  it('cancels tenant PaymentIntents on the Connect account (PAY-05)', async () => {
    await service.cancelForPayment('biz-1', 'pi_1');

    expect(
      connectContext.resolveTenantStripeChargeContext,
    ).toHaveBeenCalledWith('biz-1');
    expect(chargeCtx.stripe.paymentIntents.cancel).toHaveBeenCalledWith(
      'pi_1',
      undefined,
      { stripeAccount: 'acct_connected' },
    );
  });

  it('creates tenant PaymentIntents on the Connect account (PAY-05)', async () => {
    chargeCtx.stripe.paymentIntents.create.mockResolvedValue({
      id: 'pi_new',
      client_secret: 'secret',
      status: 'requires_payment_method',
    });

    await service.createForPayment({
      businessId: 'biz-1',
      contactId: 'contact-1',
      amountCents: 1000,
      currency: 'USD',
      description: 'Sale',
      paymentId: 'pay-1',
      payableType: PayableType.INVOICE,
      payableId: 'sale-1',
      purpose: 'checkout',
      invoiceId: 'sale-1',
    });

    expect(chargeCtx.stripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.any(Object),
      { stripeAccount: 'acct_connected' },
    );
  });
});
