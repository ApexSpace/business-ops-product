import { GiftCardSource, InvoiceLineType, InvoiceStatus } from '@prisma/client';
import { GiftCardSalesProvider } from './gift-card-sales.provider';

describe('GiftCardSalesProvider', () => {
  const businessId = 'biz-1';
  const context = {
    businessName: 'Acme Spa',
    timezone: 'America/New_York',
    currency: 'USD',
    generatedAt: new Date('2026-02-20T12:00:00.000Z'),
  };

  const filters = {
    dateRange: 'custom',
    fromDate: '2026-02-01',
    toDate: '2026-02-28',
    filterRefundsBy: 'sale_date',
    includeDailyDetails: false,
  };

  function makePrisma(params: {
    invoices?: unknown[];
    onlineCards?: unknown[];
    refundPayments?: unknown[];
  }) {
    return {
      invoice: {
        findMany: jest.fn().mockResolvedValue(params.invoices ?? []),
      },
      giftCard: {
        findMany: jest.fn().mockResolvedValue(params.onlineCards ?? []),
      },
      payment: {
        findMany: jest.fn().mockResolvedValue(params.refundPayments ?? []),
      },
    } as never;
  }

  it('builds Mangomint sales and refunds summary sections', async () => {
    const prisma = makePrisma({
      invoices: [
        {
          id: 'inv-1',
          closedAt: new Date('2026-02-10T17:00:00.000Z'),
          issueDate: new Date('2026-02-10T17:00:00.000Z'),
          items: [
            {
              id: 'item-1',
              quantity: 1,
              unitPrice: 100,
              totalPrice: 80,
              metadata: { cardValue: 100 },
            },
          ],
        },
      ],
      refundPayments: [
        {
          amount: 80,
          status: 'REFUNDED',
          stripeRefundId: null,
          providerMetadata: {
            refundedAt: '2026-02-12T17:00:00.000Z',
            amountRefunded: '80',
          },
          updatedAt: new Date('2026-02-12T17:00:00.000Z'),
          invoice: {
            closedAt: new Date('2026-02-10T17:00:00.000Z'),
            issueDate: new Date('2026-02-10T17:00:00.000Z'),
            subtotal: 80,
            items: [
              {
                lineType: InvoiceLineType.GIFT_CARD,
                totalPrice: 80,
              },
            ],
          },
        },
      ],
    });

    const provider = new GiftCardSalesProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);

    expect(doc.sections).toHaveLength(2);

    const sales = doc.sections[0]!;
    expect(sales.columns.map((column) => column.key)).toEqual([
      'giftCardCount',
      'adjustments',
      'sales',
    ]);
    expect(sales.rows[0]!.cells.giftCardCount).toBe(1);
    expect(sales.rows[0]!.cells.adjustments).toBe(20);
    expect(sales.rows[0]!.cells.sales).toBe(80);

    const refunds = doc.sections[1]!;
    expect(refunds.title).toBe('Refunds');
    expect(refunds.columns.map((column) => column.key)).toEqual([
      'refundCount',
      'refunds',
    ]);
    expect(refunds.rows[0]!.cells.refundCount).toBe(1);
    expect(refunds.rows[0]!.cells.refunds).toBe(80);
  });

  it('adds daily sections when includeDailyDetails is enabled', async () => {
    const prisma = makePrisma({
      invoices: [
        {
          id: 'inv-1',
          closedAt: new Date('2026-02-10T17:00:00.000Z'),
          issueDate: new Date('2026-02-10T17:00:00.000Z'),
          items: [
            {
              id: 'item-1',
              quantity: 1,
              unitPrice: 50,
              totalPrice: 50,
              metadata: {},
            },
          ],
        },
      ],
      onlineCards: [
        {
          id: 'gc-online',
          initialValue: 25,
          createdAt: new Date('2026-02-11T17:00:00.000Z'),
          invoiceId: null,
          promotion: null,
        },
      ],
    });

    const provider = new GiftCardSalesProvider(prisma);
    const doc = await provider.generate(
      businessId,
      { ...filters, includeDailyDetails: true },
      context,
    );

    expect(doc.sections.length).toBeGreaterThan(2);
    expect(doc.sections.some((section) => section.id.startsWith('day-'))).toBe(
      true,
    );

    expect(prisma.giftCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          source: GiftCardSource.ONLINE_PURCHASE,
        }),
      }),
    );
    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              status: {
                in: [InvoiceStatus.PAID, InvoiceStatus.PARTIAL],
              },
            }),
          ]),
        }),
      }),
    );
  });
});
