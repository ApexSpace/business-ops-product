import { PaymentMethod, PaymentStatus, PayableType } from '@prisma/client';
import { PaymentOrchestratorService } from './payment-orchestrator.service';

describe('PaymentOrchestratorService', () => {
  const businessId = 'biz-1';
  const payableId = 'inv-1';
  const contactId = 'contact-1';

  let service: PaymentOrchestratorService;
  let prisma: {
    payment: { create: jest.Mock; update: jest.Mock; count: jest.Mock };
  };
  let registry: { get: jest.Mock; register: jest.Mock };
  let handler: {
    resolvePayable: jest.Mock;
    onPaymentComplete: jest.Mock;
    syncPayablePayments: jest.Mock;
  };
  let walletLedger: { debit: jest.Mock };
  let stripePaymentIntent: { createForPayment: jest.Mock };
  let stripeCheckout: { createInvoiceCheckoutSession: jest.Mock };
  let invoiceRepository: { findById: jest.Mock; update: jest.Mock };
  let contactPaymentMethods: { requirePaymentMethodForCharge: jest.Mock };
  let paymentRealtime: {
    publishPaymentCollected: jest.Mock;
    publishCheckoutClosed: jest.Mock;
  };
  let auditService: { log: jest.Mock };

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
      },
    };
    walletLedger = { debit: jest.fn().mockResolvedValue('wallet-tx-1') };
    stripePaymentIntent = {
      createForPayment: jest.fn().mockResolvedValue({
        paymentIntentId: 'pi_1',
        clientSecret: 'secret',
        succeeded: false,
      }),
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
      handler as never,
    );
  });

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

    const result = await service.collectPayment({
      businessId,
      payableType: PayableType.INVOICE,
      payableId,
      tenders: [{ method: PaymentMethod.STRIPE, amount: 50 }],
      channel: 'STAFF_POS',
      stripeMode: 'EMBEDDED',
      actorUserId: 'user-1',
    });

    expect(result.completed).toBe(false);
    expect(result.stripeTenders).toHaveLength(1);
    expect(result.stripeTenders[0].clientSecret).toBe('secret');
    expect(handler.onPaymentComplete).not.toHaveBeenCalled();
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
