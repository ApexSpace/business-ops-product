import { InvoiceLineType, PaymentStatus } from '@prisma/client';
import { ProductSalesProvider } from './product-sales.provider';

describe('ProductSalesProvider', () => {
  const businessId = 'biz-1';
  const context = {
    businessName: 'Demo Spa',
    timezone: 'America/New_York',
    currency: 'USD',
    generatedAt: new Date('2026-07-18T23:00:00.000Z'),
  };

  const monthFilters = {
    dateRange: 'custom',
    fromDate: '2026-06-28',
    toDate: '2026-07-11',
  };

  function makePrisma(opts: {
    invoices?: unknown[];
    payments?: unknown[];
  }) {
    return {
      invoice: {
        findMany: jest.fn().mockResolvedValue(opts.invoices ?? []),
      },
      payment: {
        findMany: jest.fn().mockResolvedValue(opts.payments ?? []),
      },
    } as never;
  }

  it('groups products by brand with adjustments, refunds, and footnote', async () => {
    const prisma = makePrisma({
      invoices: [
        {
          id: 'inv-1',
          closedAt: new Date('2026-07-02T15:00:00.000Z'),
          issueDate: new Date('2026-07-02T15:00:00.000Z'),
          items: [
            {
              lineType: InvoiceLineType.PRODUCT,
              title: 'Serum',
              quantity: 2,
              unitPrice: 40,
              totalPrice: 70,
              productId: 'prod-1',
              product: {
                name: 'Serum',
                brand: 'SkinLab',
                unitPrice: 40,
                category: { name: 'Skincare' },
              },
            },
          ],
        },
      ],
      payments: [],
    });

    const provider = new ProductSalesProvider(prisma);
    const doc = await provider.generate(
      businessId,
      { ...monthFilters, groupBy: 'brand', sortBy: 'total_sales' },
      context,
    );

    expect(doc.meta.reportKey).toBe('product_sales');
    expect(doc.meta.footnotes).toEqual([
      'The sales amount does not account for any refunds that were issued.',
    ]);
    expect(doc.sections.map((s) => s.id)).toEqual(['products', 'refunds']);
    expect(doc.sections[0]!.columns[0]!.label).toBe('Brand/Product');

    const products = doc.sections[0]!;
    expect(
      products.rows.some((r) => r.isGroup && r.cells.label === 'SkinLab'),
    ).toBe(true);
    expect(
      products.rows.some((r) => r.depth === 1 && r.cells.label === 'Serum'),
    ).toBe(true);
    const total = products.rows.find((r) => r.isTotal)!;
    expect(total.cells.qty).toBe(2);
    expect(total.cells.sales).toBe(70);
    expect(total.cells.adjustments).toBe(10);

    expect(doc.sections[1]!.title).toBe('Refunds');
    expect(doc.sections[1]!.pageBreakBefore).toBe(true);
  });

  it('groups by category and adds daily sections when enabled', async () => {
    const prisma = makePrisma({
      invoices: [
        {
          id: 'inv-1',
          closedAt: new Date('2026-07-02T15:00:00.000Z'),
          issueDate: new Date('2026-07-02T15:00:00.000Z'),
          items: [
            {
              lineType: InvoiceLineType.PRODUCT,
              title: 'Cleanser',
              quantity: 1,
              unitPrice: 25,
              totalPrice: 25,
              productId: 'prod-2',
              product: {
                name: 'Cleanser',
                brand: 'SkinLab',
                unitPrice: 25,
                category: { name: 'Skincare' },
              },
            },
          ],
        },
        {
          id: 'inv-2',
          closedAt: new Date('2026-07-03T15:00:00.000Z'),
          issueDate: new Date('2026-07-03T15:00:00.000Z'),
          items: [
            {
              lineType: InvoiceLineType.PRODUCT,
              title: 'Towel',
              quantity: 3,
              unitPrice: 10,
              totalPrice: 30,
              productId: 'prod-3',
              product: {
                name: 'Towel',
                brand: null,
                unitPrice: 10,
                category: { name: 'Retail' },
              },
            },
          ],
        },
      ],
      payments: [],
    });

    const provider = new ProductSalesProvider(prisma);
    const doc = await provider.generate(
      businessId,
      {
        ...monthFilters,
        groupBy: 'category',
        includeDailyDetails: true,
      },
      context,
    );

    expect(doc.sections[0]!.columns[0]!.label).toBe('Category/Product');
    const ids = doc.sections.map((s) => s.id);
    expect(ids[0]).toBe('products');
    expect(ids[1]).toBe('refunds');
    expect(ids.filter((id) => id.startsWith('day-'))).toHaveLength(2);
    expect(doc.sections[2]!.pageBreakBefore).toBe(true);
    expect(doc.sections[3]!.pageBreakBefore).toBe(false);
    expect(
      doc.sections[0]!.rows.some(
        (r) => r.isGroup && r.cells.label === 'Skincare',
      ),
    ).toBe(true);
  });

  it('attributes product refunds filtered by sale date', async () => {
    const prisma = makePrisma({
      invoices: [],
      payments: [
        {
          amount: 50,
          status: PaymentStatus.REFUNDED,
          updatedAt: new Date('2026-08-01T12:00:00.000Z'),
          invoice: {
            closedAt: new Date('2026-07-05T12:00:00.000Z'),
            issueDate: new Date('2026-07-05T12:00:00.000Z'),
            items: [
              {
                lineType: InvoiceLineType.PRODUCT,
                title: 'Serum',
                totalPrice: 50,
                productId: 'prod-1',
                product: {
                  name: 'Serum',
                  brand: 'SkinLab',
                  category: { name: 'Skincare' },
                },
              },
            ],
          },
        },
      ],
    });

    const provider = new ProductSalesProvider(prisma);
    const doc = await provider.generate(
      businessId,
      {
        ...monthFilters,
        groupBy: 'brand',
        filterRefundsBy: 'sale_date',
      },
      context,
    );

    const refunds = doc.sections.find((s) => s.id === 'refunds')!;
    const total = refunds.rows.find((r) => r.isTotal)!;
    expect(total.cells.refundCount).toBe(1);
    expect(total.cells.refundAmount).toBe(50);
    expect(
      refunds.rows.some((r) => r.isGroup && r.cells.label === 'SkinLab'),
    ).toBe(true);
  });
});
