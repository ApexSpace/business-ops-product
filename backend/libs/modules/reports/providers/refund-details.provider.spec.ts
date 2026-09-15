import { PaymentMethod, PaymentProvider, PaymentStatus } from '@prisma/client';
import { RefundDetailsProvider } from './refund-details.provider';

describe('RefundDetailsProvider', () => {
  const businessId = 'biz-1';
  const context = {
    businessName: 'Demo Spa',
    timezone: 'America/New_York',
    currency: 'USD',
    generatedAt: new Date('2026-07-18T23:00:00.000Z'),
  };

  const monthFilters = {
    dateRange: 'custom',
    fromDate: '2026-05-01',
    toDate: '2026-05-31',
  };

  function makePrisma(payments: unknown[]) {
    return {
      payment: {
        findMany: jest.fn().mockResolvedValue(payments),
      },
    } as never;
  }

  it('builds Payment Refunds rows with Mangomint columns', async () => {
    const prisma = makePrisma([
      {
        id: '11111111-2222-3333-4444-555555555555',
        amount: 85.5,
        method: PaymentMethod.STRIPE,
        provider: PaymentProvider.STRIPE,
        status: PaymentStatus.SUCCEEDED,
        reference: null,
        stripePaymentIntentId: 'pi_abc123456789',
        stripeChargeId: 'ch_charge999',
        stripeRefundId: 're_refund8888',
        providerMetadata: {
          refundedAt: '2026-05-12T16:30:00.000Z',
          amountRefunded: '85.50',
        },
        updatedAt: new Date('2026-05-12T16:30:00.000Z'),
        contact: {
          displayName: 'Jane Client',
          firstName: 'Jane',
          lastName: 'Client',
        },
        createdBy: { firstName: 'Alex', lastName: 'Staff' },
        contactPaymentMethod: { brand: 'visa', last4: '4242' },
        invoice: {
          invoiceNumber: 'INV-1001',
          closedBy: null,
          items: [],
        },
      },
    ]);

    const provider = new RefundDetailsProvider(prisma);
    const doc = await provider.generate(businessId, monthFilters, context);

    expect(doc.meta.reportKey).toBe('refund_details');
    const section = doc.sections[0]!;
    expect(section.title).toBe('Payment Refunds');
    expect(section.columns.map((c) => c.key)).toEqual([
      'transactionNumber',
      'refundNumber',
      'saleNumber',
      'transactionDate',
      'client',
      'staffMember',
      'refundMethod',
      'paymentAccount',
      'refundAmount',
    ]);

    const dataRow = section.rows.find((r) => !r.isTotal)!;
    expect(dataRow.cells.saleNumber).toBe('INV-1001');
    expect(dataRow.cells.client).toBe('Jane Client');
    expect(dataRow.cells.staffMember).toBe('Alex Staff');
    expect(dataRow.cells.refundMethod).toBe('Card');
    expect(dataRow.cells.paymentAccount).toBe('Visa •••• 4242');
    expect(dataRow.cells.refundAmount).toBe(85.5);
    expect(String(dataRow.cells.transactionNumber).length).toBeGreaterThan(0);
    expect(String(dataRow.cells.refundNumber).length).toBeGreaterThan(0);

    const total = section.rows.find((r) => r.isTotal)!;
    expect(total.cells.transactionNumber).toBe('Total');
    expect(total.cells.refundAmount).toBe(85.5);
  });

  it('includes metadata-only refunds and excludes those outside the range', async () => {
    const prisma = makePrisma([
      {
        id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        amount: 40,
        method: PaymentMethod.CASH,
        provider: PaymentProvider.MANUAL,
        status: PaymentStatus.SUCCEEDED,
        reference: 'TX-9',
        stripePaymentIntentId: null,
        stripeChargeId: null,
        stripeRefundId: null,
        providerMetadata: {
          refundedAt: '2026-05-03T12:00:00.000Z',
          amountRefunded: '40.00',
        },
        updatedAt: new Date('2026-05-03T12:00:00.000Z'),
        contact: {
          displayName: null,
          firstName: 'Sam',
          lastName: 'Lee',
        },
        createdBy: null,
        contactPaymentMethod: null,
        invoice: {
          invoiceNumber: 'INV-2002',
          closedBy: { firstName: 'Pat', lastName: 'Owner' },
          items: [],
        },
      },
      {
        id: 'ffffffff-1111-2222-3333-444444444444',
        amount: 10,
        method: PaymentMethod.CASH,
        provider: PaymentProvider.MANUAL,
        status: PaymentStatus.SUCCEEDED,
        reference: null,
        stripePaymentIntentId: null,
        stripeChargeId: null,
        stripeRefundId: null,
        providerMetadata: {
          refundedAt: '2026-06-01T12:00:00.000Z',
        },
        updatedAt: new Date('2026-06-01T12:00:00.000Z'),
        contact: {
          displayName: 'Out of Range',
          firstName: null,
          lastName: null,
        },
        createdBy: null,
        contactPaymentMethod: null,
        invoice: {
          invoiceNumber: 'INV-3003',
          closedBy: null,
          items: [],
        },
      },
    ]);

    const provider = new RefundDetailsProvider(prisma);
    const doc = await provider.generate(businessId, monthFilters, context);
    const dataRows = doc.sections[0]!.rows.filter((r) => !r.isTotal);

    expect(dataRows).toHaveLength(1);
    expect(dataRows[0]!.cells.client).toBe('Sam Lee');
    expect(dataRows[0]!.cells.staffMember).toBe('Pat Owner');
    expect(dataRows[0]!.cells.refundMethod).toBe('Cash');
    expect(dataRows[0]!.cells.paymentAccount).toBe('Cash');
    expect(dataRows[0]!.cells.transactionNumber).toBe('TX-9');
  });
});
