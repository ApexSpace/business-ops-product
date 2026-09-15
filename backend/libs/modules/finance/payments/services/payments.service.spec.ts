import {
  BusinessMemberRole,
  InvoiceKind,
  InvoiceStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';

describe('PaymentsService.refund (SALE-AUD-05)', () => {
  const businessId = 'biz-1';
  const actor: RequestUser = {
    id: 'owner-1',
    email: 'owner@example.com',
    context: 'business',
    businessId,
    businessRole: BusinessMemberRole.OWNER,
  };

  const paidAt = new Date('2026-07-31T12:00:00.000Z');

  function paymentRow(overrides: Record<string, unknown> = {}) {
    return {
      id: 'pay-1',
      businessId,
      invoiceId: 'inv-1',
      contactId: 'contact-1',
      payableType: 'INVOICE',
      payableId: 'inv-1',
      amount: new Prisma.Decimal('50.00'),
      method: PaymentMethod.CASH,
      status: PaymentStatus.SUCCEEDED,
      provider: PaymentProvider.MANUAL,
      stripePaymentIntentId: null,
      stripeCheckoutSessionId: null,
      stripeChargeId: null,
      stripeRefundId: null,
      providerMetadata: null,
      reference: null,
      notes: null,
      paidAt,
      createdById: actor.id,
      createdAt: paidAt,
      updatedAt: paidAt,
      contact: {
        id: 'contact-1',
        displayName: 'Ada',
        firstName: 'Ada',
        lastName: 'Lovelace',
        companyName: null,
        email: 'ada@example.com',
        phoneCountryCode: null,
        phoneNumber: null,
      },
      invoice: {
        id: 'inv-1',
        invoiceNumber: 'Sale #1',
        totalAmount: new Prisma.Decimal('50.00'),
        balanceDue: new Prisma.Decimal('0.00'),
        status: InvoiceStatus.PAID,
      },
      createdBy: {
        id: actor.id,
        email: actor.email,
        firstName: 'Owner',
        lastName: 'One',
      },
      ...overrides,
    };
  }

  function buildService() {
    const paymentRepository = {
      findById: jest.fn(),
    };
    const refundsCreate = jest.fn().mockResolvedValue({ id: 're_1' });
    const prisma = {
      payment: {
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      invoice: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'inv-1',
          businessId,
          status: InvoiceStatus.PAID,
          totalAmount: new Prisma.Decimal('50.00'),
          kind: InvoiceKind.CHECKOUT,
          closedAt: paidAt,
          deletedAt: null,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const auditService = { log: jest.fn().mockResolvedValue(undefined) };
    const stripeApiService = { logStripeError: jest.fn() };
    const stripeConnectContext = {
      resolveTenantStripeChargeContext: jest.fn().mockResolvedValue({
        stripe: { refunds: { create: refundsCreate } },
        stripeAccountId: 'acct_connected',
      }),
    };

    const service = new PaymentsService(
      paymentRepository as never,
      {} as never,
      prisma as never,
      auditService as never,
      stripeApiService as never,
      stripeConnectContext as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    return {
      service,
      paymentRepository,
      prisma,
      auditService,
      stripeConnectContext,
      refundsCreate,
    };
  }

  it('sets PaymentStatus.REFUNDED and reopens a fully refunded checkout', async () => {
    const { service, paymentRepository, prisma } = buildService();
    const existing = paymentRow();
    const refunded = paymentRow({ status: PaymentStatus.REFUNDED });
    paymentRepository.findById
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(refunded);

    const result = await service.refund(businessId, 'pay-1', actor);

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay-1' },
      data: expect.objectContaining({
        status: PaymentStatus.REFUNDED,
        providerMetadata: expect.objectContaining({
          amountRefunded: '50.00',
          refundedAt: expect.any(String),
        }),
      }),
    });
    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: expect.objectContaining({
        status: InvoiceStatus.OPEN,
        paidAmount: expect.anything(),
      }),
    });
    expect(result.status).toBe(PaymentStatus.REFUNDED);
  });

  it('refunds Stripe charges on the connected account, not the platform', async () => {
    const { service, paymentRepository, stripeConnectContext, refundsCreate } =
      buildService();
    const existing = paymentRow({
      method: PaymentMethod.STRIPE,
      provider: PaymentProvider.STRIPE,
      stripePaymentIntentId: 'pi_sale_1',
    });
    paymentRepository.findById
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(
        paymentRow({
          method: PaymentMethod.STRIPE,
          provider: PaymentProvider.STRIPE,
          stripePaymentIntentId: 'pi_sale_1',
          status: PaymentStatus.REFUNDED,
        }),
      );

    await service.refund(businessId, 'pay-1', actor);

    expect(
      stripeConnectContext.resolveTenantStripeChargeContext,
    ).toHaveBeenCalledWith(businessId);
    expect(refundsCreate).toHaveBeenCalledWith(
      { payment_intent: 'pi_sale_1' },
      { stripeAccount: 'acct_connected' },
    );
  });
});
