import { MembershipBillingEventType } from '@prisma/client';
import { MembershipPaymentsProvider } from './membership-payments.provider';

describe('MembershipPaymentsProvider', () => {
  const businessId = 'biz-1';
  const context = {
    businessName: 'Acme Spa',
    timezone: 'America/New_York',
    currency: 'USD',
    generatedAt: new Date('2026-07-20T12:00:00.000Z'),
  };

  const filters = {
    dateRange: 'custom',
    fromDate: '2026-07-01',
    toDate: '2026-07-31',
    filterRefundsBy: 'sale_date',
    includeDailyDetails: false,
  };

  function makePrisma(params: {
    events?: unknown[];
    paymentEventsForRefund?: unknown[];
    refundPayments?: unknown[];
  }) {
    return {
      membershipBillingEvent: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce(params.events ?? [])
          .mockResolvedValueOnce(params.paymentEventsForRefund ?? []),
      },
      payment: {
        findMany: jest.fn().mockResolvedValue(params.refundPayments ?? []),
      },
    } as never;
  }

  it('builds Mangomint payment and refund sections', async () => {
    const prisma = makePrisma({
      events: [
        {
          id: 'evt-1',
          eventType: MembershipBillingEventType.PAYMENT_SUCCEEDED,
          amount: 120,
          occurredAt: new Date('2026-07-10T16:00:00.000Z'),
          clientMembership: {
            price: 120,
            plan: { name: 'VIP Membership', price: 120 },
          },
        },
        {
          id: 'evt-2',
          eventType: MembershipBillingEventType.SUBSCRIPTION_RENEWED,
          amount: 120,
          occurredAt: new Date('2026-07-15T16:00:00.000Z'),
          clientMembership: {
            price: 120,
            plan: { name: 'VIP Membership', price: 120 },
          },
        },
      ],
      paymentEventsForRefund: [
        {
          occurredAt: new Date('2026-07-10T16:00:00.000Z'),
          stripePaymentIntentId: 'pi_123',
          stripeInvoiceId: 'in_123',
          amount: 120,
          clientMembership: {
            price: 120,
            plan: { name: 'VIP Membership', price: 120 },
          },
        },
      ],
      refundPayments: [
        {
          amount: 120,
          status: 'REFUNDED',
          stripeRefundId: null,
          stripePaymentIntentId: 'pi_123',
          providerMetadata: {
            refundedAt: '2026-07-12T16:00:00.000Z',
            amountRefunded: '120',
          },
          updatedAt: new Date('2026-07-12T16:00:00.000Z'),
        },
      ],
    });

    const provider = new MembershipPaymentsProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);

    expect(doc.sections).toHaveLength(2);

    const payments = doc.sections[0]!;
    expect(payments.title).toBe('# Membership Payments');
    expect(payments.columns.map((column) => column.key)).toEqual([
      'name',
      'total',
      'newCount',
      'sales',
    ]);
    const paymentRow = payments.rows.find((entry) => !entry.isTotal)!;
    expect(paymentRow.cells.name).toBe('VIP Membership');
    expect(paymentRow.cells.total).toBe(2);
    expect(paymentRow.cells.newCount).toBe(1);
    expect(paymentRow.cells.sales).toBe(240);

    const refunds = doc.sections[1]!;
    expect(refunds.title).toBe('Refunds');
    const refundRow = refunds.rows.find((entry) => !entry.isTotal)!;
    expect(refundRow.cells.name).toBe('VIP Membership');
    expect(refundRow.cells.refundCount).toBe(1);
    expect(refundRow.cells.refunds).toBe(120);
  });

  it('adds daily sections when includeDailyDetails is enabled', async () => {
    const prisma = makePrisma({
      events: [
        {
          id: 'evt-1',
          eventType: MembershipBillingEventType.PAYMENT_SUCCEEDED,
          amount: 99,
          occurredAt: new Date('2026-07-10T16:00:00.000Z'),
          clientMembership: {
            price: 99,
            plan: { name: 'Basic', price: 99 },
          },
        },
      ],
    });

    const provider = new MembershipPaymentsProvider(prisma);
    const doc = await provider.generate(
      businessId,
      { ...filters, includeDailyDetails: true },
      context,
    );

    expect(doc.sections.some((section) => section.id.startsWith('day-'))).toBe(
      true,
    );
  });
});
