import {
  InvoiceKind,
  InvoiceStatus,
  PaymentStatus,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { StripeInvoicePaymentService } from './stripe-invoice-payment.service';

describe('StripeInvoicePaymentService.handleChargeRefunded (SALE-AUD-05)', () => {
  function buildService() {
    const tx = {
      payment: {
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      invoice: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'inv-1',
          businessId: 'biz-1',
          status: InvoiceStatus.PAID,
          totalAmount: new Prisma.Decimal('50.00'),
          kind: InvoiceKind.CHECKOUT,
          closedAt: new Date('2026-07-31T12:00:00.000Z'),
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      payment: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<unknown>) =>
        fn(tx),
      ),
    };
    const auditService = { log: jest.fn().mockResolvedValue(undefined) };

    const service = new StripeInvoicePaymentService(
      prisma as never,
      auditService as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    return { service, prisma, tx, auditService };
  }

  const event = {
    id: 'evt_refund_1',
    type: 'charge.refunded',
    livemode: false,
    data: {
      object: {
        id: 'ch_1',
        amount: 5000,
        amount_refunded: 5000,
        payment_intent: 'pi_sale_1',
        metadata: { businessId: 'biz-1', invoiceId: 'inv-1' },
      },
    },
  };

  it('sets the payment REFUNDED and resyncs the checkout to OPEN', async () => {
    const { service, prisma, tx, auditService } = buildService();
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay-1',
      amount: new Prisma.Decimal('50.00'),
      status: PaymentStatus.SUCCEEDED,
      stripeRefundId: null,
      providerMetadata: { stripeEventId: 'evt_pay' },
    });

    await service.handleChargeRefunded(event as never);

    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay-1' },
      data: expect.objectContaining({
        status: PaymentStatus.REFUNDED,
        stripeRefundId: 'ch_1',
        providerMetadata: expect.objectContaining({
          amountRefunded: '50.00',
          refundedAt: expect.any(String),
        }),
      }),
    });
    expect(tx.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: expect.objectContaining({
        status: InvoiceStatus.OPEN,
      }),
    });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'invoice.refunded',
        businessId: 'biz-1',
        entityId: 'inv-1',
      }),
    );
  });

  it('does not call Stripe refunds.create (Connect charge already refunded)', async () => {
    const { service, prisma } = buildService();
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay-1',
      amount: new Prisma.Decimal('50.00'),
      status: PaymentStatus.SUCCEEDED,
      stripeRefundId: null,
      providerMetadata: null,
    });

    await service.handleChargeRefunded(event as never);

    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
