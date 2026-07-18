import { InvoiceLineType, PaymentStatus } from '@prisma/client';
import { RefundSummaryProvider } from './refund-summary.provider';

describe('RefundSummaryProvider', () => {
  const businessId = 'biz-1';
  const context = {
    businessName: 'Demo Spa',
    timezone: 'America/New_York',
    currency: 'USD',
    generatedAt: new Date('2026-07-18T23:00:00.000Z'),
  };

  const monthFilters = {
    dateRange: 'custom',
    fromDate: '2026-07-01',
    toDate: '2026-07-31',
  };

  function makePrisma(payments: unknown[]) {
    return {
      payment: {
        findMany: jest.fn().mockResolvedValue(payments),
      },
    } as never;
  }

  it('builds daily Total Refunds rows with Mangomint columns', async () => {
    const prisma = makePrisma([
      {
        amount: 110,
        status: PaymentStatus.SUCCEEDED,
        stripeRefundId: null,
        providerMetadata: {
          refundedAt: '2026-07-10T18:00:00.000Z',
          amountRefunded: '110',
        },
        updatedAt: new Date('2026-07-10T18:00:00.000Z'),
        invoice: {
          closedAt: new Date('2026-07-05T15:00:00.000Z'),
          issueDate: new Date('2026-07-05T15:00:00.000Z'),
          subtotal: 100,
          taxAmount: 10,
          metadata: { tipAmount: 0 },
          items: [
            {
              lineType: InvoiceLineType.SERVICE,
              quantity: 2,
            },
            {
              lineType: InvoiceLineType.PRODUCT,
              quantity: 1,
            },
          ],
        },
      },
    ]);

    const provider = new RefundSummaryProvider(prisma);
    const doc = await provider.generate(
      businessId,
      { ...monthFilters, filterRefundsBy: 'refund_date' },
      context,
    );

    expect(doc.meta.reportKey).toBe('refund_summary');
    expect(doc.meta.footnotes[0]).toContain('individual items were refunded');

    const section = doc.sections[0]!;
    expect(section.title).toBe('Total Refunds');
    expect(section.subtitle).toBe('Filtered by: Refund Date');
    expect(section.columns.map((c) => c.key)).toEqual([
      'date',
      'refundCount',
      'subtotal',
      'taxes',
      'tips',
      'total',
    ]);

    const dayRow = section.rows.find((r) => !r.isTotal)!;
    expect(dayRow.cells.refundCount).toBe(3);
    expect(dayRow.cells.subtotal).toBe(100);
    expect(dayRow.cells.taxes).toBe(10);
    expect(dayRow.cells.tips).toBe(0);
    expect(dayRow.cells.total).toBe(110);

    const total = section.rows.find((r) => r.isTotal)!;
    expect(total.cells.date).toBe('Total');
    expect(total.cells.total).toBe(110);
  });

  it('filters and buckets by sale date when selected', async () => {
    const prisma = makePrisma([
      {
        amount: 50,
        status: PaymentStatus.SUCCEEDED,
        stripeRefundId: null,
        providerMetadata: {
          refundedAt: '2026-08-02T18:00:00.000Z',
          amountRefunded: '50',
        },
        // Refund processed outside July — still included when filtering by sale date.
        updatedAt: new Date('2026-08-02T18:00:00.000Z'),
        invoice: {
          closedAt: new Date('2026-07-12T15:00:00.000Z'),
          issueDate: new Date('2026-07-12T15:00:00.000Z'),
          subtotal: 50,
          taxAmount: 0,
          metadata: {},
          items: [{ lineType: InvoiceLineType.PRODUCT, quantity: 1 }],
        },
      },
      {
        amount: 20,
        status: PaymentStatus.SUCCEEDED,
        stripeRefundId: null,
        providerMetadata: {
          refundedAt: '2026-07-20T18:00:00.000Z',
        },
        updatedAt: new Date('2026-07-20T18:00:00.000Z'),
        invoice: {
          // Sale outside range — excluded for sale_date filter.
          closedAt: new Date('2026-06-01T15:00:00.000Z'),
          issueDate: new Date('2026-06-01T15:00:00.000Z'),
          subtotal: 20,
          taxAmount: 0,
          metadata: {},
          items: [{ lineType: InvoiceLineType.SERVICE, quantity: 1 }],
        },
      },
    ]);

    const provider = new RefundSummaryProvider(prisma);
    const doc = await provider.generate(
      businessId,
      { ...monthFilters, filterRefundsBy: 'sale_date' },
      context,
    );

    const section = doc.sections[0]!;
    expect(section.subtitle).toBe('Filtered by: Sale Date');
    expect(section.rows.filter((r) => !r.isTotal)).toHaveLength(1);
    expect(section.rows.find((r) => r.isTotal)!.cells.total).toBe(50);
    expect(section.rows.find((r) => r.isTotal)!.cells.refundCount).toBe(1);
  });

  it('allocates tips from invoice metadata proportionally', async () => {
    const prisma = makePrisma([
      {
        amount: 115,
        status: PaymentStatus.SUCCEEDED,
        stripeRefundId: null,
        providerMetadata: {
          refundedAt: '2026-07-08T18:00:00.000Z',
          amountRefunded: '115',
        },
        updatedAt: new Date('2026-07-08T18:00:00.000Z'),
        invoice: {
          closedAt: new Date('2026-07-08T15:00:00.000Z'),
          issueDate: new Date('2026-07-08T15:00:00.000Z'),
          subtotal: 100,
          taxAmount: 5,
          metadata: { tipAmount: 10 },
          items: [{ lineType: InvoiceLineType.SERVICE, quantity: 1 }],
        },
      },
    ]);

    const provider = new RefundSummaryProvider(prisma);
    const doc = await provider.generate(
      businessId,
      { ...monthFilters, filterRefundsBy: 'refund_date' },
      context,
    );

    const dayRow = doc.sections[0]!.rows.find((r) => !r.isTotal)!;
    expect(dayRow.cells.subtotal).toBe(100);
    expect(dayRow.cells.taxes).toBe(5);
    expect(dayRow.cells.tips).toBe(10);
    expect(dayRow.cells.total).toBe(115);
  });
});
