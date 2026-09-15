import { InvoiceLineType, InvoiceStatus } from '@prisma/client';
import { PackageSalesProvider } from './package-sales.provider';

describe('PackageSalesProvider', () => {
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
    invoices?: unknown[];
    templates?: unknown[];
    onlinePackages?: unknown[];
    refundPayments?: unknown[];
    refundTemplates?: unknown[];
  }) {
    return {
      invoice: {
        findMany: jest.fn().mockResolvedValue(params.invoices ?? []),
      },
      packageTemplate: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce(params.templates ?? [])
          .mockResolvedValueOnce(params.refundTemplates ?? []),
      },
      clientPackage: {
        findMany: jest.fn().mockResolvedValue(params.onlinePackages ?? []),
      },
      payment: {
        findMany: jest.fn().mockResolvedValue(params.refundPayments ?? []),
      },
    } as never;
  }

  it('builds Mangomint sales and refunds sections with totals', async () => {
    const prisma = makePrisma({
      invoices: [
        {
          id: 'inv-1',
          closedAt: new Date('2026-07-10T16:00:00.000Z'),
          issueDate: new Date('2026-07-10T16:00:00.000Z'),
          items: [
            {
              id: 'item-1',
              title: 'Glow Package',
              quantity: 1,
              unitPrice: 200,
              totalPrice: 180,
              metadata: { packageTemplateId: 'tpl-1' },
            },
          ],
        },
      ],
      templates: [
        { id: 'tpl-1', name: 'Glow Package', totalPrice: 200 },
      ],
      refundPayments: [
        {
          amount: 180,
          status: 'REFUNDED',
          stripeRefundId: null,
          providerMetadata: {
            refundedAt: '2026-07-12T16:00:00.000Z',
            amountRefunded: '180',
          },
          updatedAt: new Date('2026-07-12T16:00:00.000Z'),
          invoice: {
            closedAt: new Date('2026-07-10T16:00:00.000Z'),
            issueDate: new Date('2026-07-10T16:00:00.000Z'),
            subtotal: 180,
            items: [
              {
                title: 'Glow Package',
                quantity: 1,
                totalPrice: 180,
                metadata: { packageTemplateId: 'tpl-1' },
              },
            ],
          },
        },
      ],
      refundTemplates: [
        { id: 'tpl-1', name: 'Glow Package' },
      ],
    });

    const provider = new PackageSalesProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);

    expect(doc.sections).toHaveLength(2);

    const sales = doc.sections[0]!;
    expect(sales.columns.map((column) => column.key)).toEqual([
      'name',
      'qty',
      'adjustments',
      'sales',
    ]);
    const salesRow = sales.rows.find((entry) => !entry.isTotal)!;
    expect(salesRow.cells.name).toBe('Glow Package');
    expect(salesRow.cells.qty).toBe(1);
    expect(salesRow.cells.adjustments).toBe(20);
    expect(salesRow.cells.sales).toBe(180);

    const refunds = doc.sections[1]!;
    expect(refunds.title).toBe('Refunds');
    expect(refunds.columns.map((column) => column.key)).toEqual([
      'name',
      'refundCount',
      'refunds',
    ]);
    const refundRow = refunds.rows.find((entry) => !entry.isTotal)!;
    expect(refundRow.cells.name).toBe('Glow Package');
    expect(refundRow.cells.refundCount).toBe(1);
    expect(refundRow.cells.refunds).toBe(180);
  });

  it('adds daily sections when includeDailyDetails is enabled', async () => {
    const prisma = makePrisma({
      invoices: [
        {
          id: 'inv-1',
          closedAt: new Date('2026-07-10T16:00:00.000Z'),
          issueDate: new Date('2026-07-10T16:00:00.000Z'),
          items: [
            {
              id: 'item-1',
              title: 'Glow Package',
              quantity: 1,
              unitPrice: 100,
              totalPrice: 100,
              metadata: { packageTemplateId: 'tpl-1' },
            },
          ],
        },
      ],
      templates: [{ id: 'tpl-1', name: 'Glow Package', totalPrice: 100 }],
    });

    const provider = new PackageSalesProvider(prisma);
    const doc = await provider.generate(
      businessId,
      { ...filters, includeDailyDetails: true },
      context,
    );

    expect(doc.sections.some((section) => section.id.startsWith('day-'))).toBe(
      true,
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
    expect(InvoiceLineType.PACKAGE).toBe('PACKAGE');
  });
});
