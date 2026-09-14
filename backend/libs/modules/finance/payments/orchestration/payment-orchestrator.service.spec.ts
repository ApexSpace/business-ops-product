import { PaymentMethod, PaymentStatus, PayableType } from '@prisma/client';
import { PaymentOrchestratorService } from './payment-orchestrator.service';

describe('PaymentOrchestratorService', () => {
  const businessId = 'biz-1';
  const payableId = 'inv-1';
  const contactId = 'contact-1';

  let service: PaymentOrchestratorService;
  let prisma: {
    payment: {
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
    };
  };
  let registry: { get: jest.Mock; register: jest.Mock };
  let handler: {
    resolvePayable: jest.Mock;
    onPaymentComplete: jest.Mock;
    syncPayablePayments: jest.Mock;
  };
  let walletLedger: { debit: jest.Mock };
  let stripePaymentIntent: {
    createForPayment: jest.Mock;
    retrieveForPayment: jest.Mock;
  };
  let stripeCheckout: { createInvoiceCheckoutSession: jest.Mock };
  let invoiceRepository: { findById: jest.Mock; update: jest.Mock };
  let contactPaymentMethods: { requirePaymentMethodForCharge: jest.Mock };
  let paymentRealtime: {
    publishPaymentCollected: jest.Mock;
    publishCheckoutClosed: jest.Mock;
  };
  let auditService: { log: jest.Mock };
  let giftCardRedemption: { redeem: jest.Mock };

  beforeEach(() => {
    handler = {
      resolvePayable: jest.fn().mockResolvedValue({
        amountDue: '100.00',
        contactId,
        description: 'Invoice 1',
        currency: 'USD',
        invoiceId: payableId,
      }),
      onPaymentComplete: jest.fn(),
      syncPayablePayments: jest.fn(),
    };
    registry = {
      get: jest.fn().mockReturnValue(handler),
      register: jest.fn(),
    };
    prisma = {
      payment: {
        create: jest.fn().mockResolvedValue({ id: 'pay-1' }),
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    walletLedger = { debit: jest.fn().mockResolvedValue('wallet-tx-1') };
    stripePaymentIntent = {
      createForPayment: jest.fn().mockResolvedValue({
        paymentIntentId: 'pi_1',
        clientSecret: 'secret',
        succeeded: false,
      }),
      retrieveForPayment: jest.fn(),
    };
    stripeCheckout = {
      createInvoiceCheckoutSession: jest.fn().mockResolvedValue({
        sessionId: 'cs_1',
        url: 'https://checkout.stripe.test',
      }),
    };
    invoiceRepository = {
      findById: jest.fn().mockResolvedValue({
        id: payableId,
        publicToken: 'token',
        contactId,
      }),
      update: jest.fn().mockResolvedValue({ publicToken: 'token' }),
    };
    contactPaymentMethods = {
      requirePaymentMethodForCharge: jest.fn(),
    };
    paymentRealtime = {
      publishPaymentCollected: jest.fn(),
      publishCheckoutClosed: jest.fn(),
    };
    auditService = { log: jest.fn() };
    giftCardRedemption = {
      redeem: jest.fn().mockResolvedValue({ amountApplied: '0.00' }),
    };

    service = new PaymentOrchestratorService(
      prisma as never,
      registry as never,
      walletLedger as never,
      stripePaymentIntent as never,
      stripeCheckout as never,
      invoiceRepository as never,
      contactPaymentMethods as never,
      paymentRealtime as never,
      auditService as never,
      giftCardRedemption as never,
    );
  });

  function collectStripe(amount: number) {
    return service.collectPayment({
      businessId,
      payableType: PayableType.INVOICE,
      payableId,
      tenders: [{ method: PaymentMethod.STRIPE, amount }],
      channel: 'STAFF_POS',
      stripeMode: 'EMBEDDED',
      actorUserId: 'user-1',
    });
  }

  it('rejects tender total above amount due', async () => {
    await expect(
      service.collectPayment({
        businessId,
        payableType: PayableType.INVOICE,
        payableId,
        tenders: [{ method: PaymentMethod.CASH, amount: 150 }],
        channel: 'STAFF_POS',
        stripeMode: 'NONE',
        actorUserId: 'user-1',
      }),
    ).rejects.toThrow('Tender total exceeds amount due');
  });

  it('collects cash and completes payable', async () => {
    const result = await service.collectPayment({
      businessId,
      payableType: PayableType.INVOICE,
      payableId,
      tenders: [{ method: PaymentMethod.CASH, amount: 50 }],
      channel: 'STAFF_POS',
      stripeMode: 'NONE',
      actorUserId: 'user-1',
    });

    expect(result.completed).toBe(true);
    expect(result.paymentIds).toHaveLength(1);
    expect(handler.onPaymentComplete).toHaveBeenCalled();
    expect(paymentRealtime.publishPaymentCollected).toHaveBeenCalled();
  });

  it('returns stripe tenders for embedded card without completing', async () => {
    prisma.payment.count.mockResolvedValue(1);

    const result = await collectStripe(50);

    expect(result.completed).toBe(false);
    expect(result.stripeTenders).toHaveLength(1);
    expect(result.stripeTenders[0].clientSecret).toBe('secret');
    expect(handler.onPaymentComplete).not.toHaveBeenCalled();
    expect(stripePaymentIntent.createForPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 5000,
        idempotencyKey: 'close:inv-1:5000',
      }),
    );
  });

  it('reuses a PENDING Stripe PaymentIntent on retry of the same amount', async () => {
    prisma.payment.count.mockResolvedValue(1);
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay-pending',
      amount: '50.00',
      stripePaymentIntentId: 'pi_existing',
    });
    stripePaymentIntent.retrieveForPayment.mockResolvedValue({
      paymentIntentId: 'pi_existing',
      clientSecret: 'secret-existing',
      succeeded: false,
      canceled: false,
    });

    const result = await collectStripe(50);

    expect(prisma.payment.create).not.toHaveBeenCalled();
    expect(stripePaymentIntent.createForPayment).not.toHaveBeenCalled();
    expect(stripePaymentIntent.retrieveForPayment).toHaveBeenCalledWith({
      businessId,
      paymentIntentId: 'pi_existing',
    });
    expect(result.stripeTenders).toHaveLength(1);
    expect(result.stripeTenders[0]).toMatchObject({
      paymentId: 'pay-pending',
      clientSecret: 'secret-existing',
      stripePaymentIntentId: 'pi_existing',
    });
  });

  it('rejects a different-amount collect while a PENDING Stripe payment exists', async () => {
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay-pending',
      amount: '50.00',
      stripePaymentIntentId: 'pi_existing',
    });

    await expect(collectStripe(30)).rejects.toThrow(
      'A card payment is already pending for this sale',
    );
    expect(prisma.payment.create).not.toHaveBeenCalled();
    expect(stripePaymentIntent.createForPayment).not.toHaveBeenCalled();
    expect(stripePaymentIntent.retrieveForPayment).not.toHaveBeenCalled();
  });

  it('settles a succeeded PENDING PI on retry instead of opening a second charge', async () => {
    prisma.payment.count.mockResolvedValue(0);
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay-pending',
      amount: '50.00',
      stripePaymentIntentId: 'pi_existing',
    });
    stripePaymentIntent.retrieveForPayment.mockResolvedValue({
      paymentIntentId: 'pi_existing',
      clientSecret: '',
      succeeded: true,
      canceled: false,
    });

    const result = await collectStripe(50);

    expect(prisma.payment.create).not.toHaveBeenCalled();
    expect(stripePaymentIntent.createForPayment).not.toHaveBeenCalled();
    expect(result.completed).toBe(true);
    expect(result.stripeTenders).toHaveLength(0);
    expect(handler.syncPayablePayments).toHaveBeenCalledWith(
      businessId,
      payableId,
    );
    expect(handler.onPaymentComplete).toHaveBeenCalled();
  });

  it('creates redirect checkout session when stripeMode is REDIRECT', async () => {
    prisma.payment.count.mockResolvedValue(1);

    const result = await service.collectPayment({
      businessId,
      payableType: PayableType.INVOICE,
      payableId,
      tenders: [{ method: PaymentMethod.STRIPE, amount: 50 }],
      channel: 'STAFF_POS',
      stripeMode: 'REDIRECT',
      actorUserId: 'user-1',
    });

    expect(result.redirectTenders).toHaveLength(1);
    expect(result.redirectTenders[0].checkoutUrl).toContain('stripe');
    expect(stripeCheckout.createInvoiceCheckoutSession).toHaveBeenCalled();
  });
});
