import { InvoiceLineType } from '@prisma/client';
import { CostOfGoodsProvider } from './cost-of-goods.provider';

describe('CostOfGoodsProvider', () => {
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
    groupBy: 'category',
  };

  function makePrisma(invoices: unknown[]) {
    return {
      invoice: {
        findMany: jest.fn().mockResolvedValue(invoices),
      },
    } as never;
  }

  it('builds Mangomint columns grouped by category with profit math', async () => {
    const prisma = makePrisma([
      {
        id: 'inv-1',
        closedAt: new Date('2026-07-10T15:00:00.000Z'),
        issueDate: new Date('2026-07-10T15:00:00.000Z'),
        items: [
          {
            lineType: InvoiceLineType.PRODUCT,
            title: 'Serum',
            quantity: 2,
            unitPrice: 50,
            totalPrice: 80,
            productId: 'prod-1',
            product: {
              name: 'Serum',
              brand: 'SkinLab',
              unitPrice: 50,
              purchaseCost: 20,
              category: { name: 'Skincare' },
            },
            variant: null,
          },
          {
            // Excluded: no purchase cost
            lineType: InvoiceLineType.PRODUCT,
            title: 'Candle',
            quantity: 1,
            unitPrice: 30,
            totalPrice: 30,
            productId: 'prod-2',
            product: {
              name: 'Candle',
              brand: 'Home',
              unitPrice: 30,
              purchaseCost: null,
              category: { name: 'Retail' },
            },
            variant: null,
          },
        ],
      },
    ]);

    const provider = new CostOfGoodsProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);

    expect(doc.meta.footnotes?.[0]).toContain('purchase costs');
    expect(doc.sections[0]!.columns.map((c) => c.key)).toEqual([
      'label',
      'qty',
      'sales',
      'cost',
      'adjustments',
      'profit',
      'profitPercent',
    ]);
    expect(doc.sections[0]!.columns[0]!.label).toBe(
      'Product Category/Product',
    );

    const section = doc.sections[0]!;
    const group = section.rows.find(
      (r) => r.isGroup && r.cells.label === 'Skincare',
    )!;
    const product = section.rows.find(
      (r) => r.depth === 1 && r.cells.label === 'Serum',
    )!;
    const total = section.rows.find((r) => r.isTotal)!;

    // Sales 80, list 100 → adjustments 20; cost 2×20=40; profit 40; 50%
    expect(product.cells.qty).toBe(2);
    expect(product.cells.sales).toBe(80);
    expect(product.cells.cost).toBe(40);
    expect(product.cells.adjustments).toBe(20);
    expect(product.cells.profit).toBe(40);
    expect(product.cells.profitPercent).toBe(50);

    expect(group.cells.sales).toBe(80);
    expect(group.cells.profit).toBe(40);

    expect(total.cells.label).toBe('Total');
    expect(total.cells.sales).toBe(80);
    expect(total.cells.cost).toBe(40);
    expect(total.cells.profit).toBe(40);
    expect(total.cells.profitPercent).toBe(50);

    // Candle without purchase cost must not appear
    expect(
      section.rows.some((r) => r.cells.label === 'Candle'),
    ).toBe(false);
  });

  it('groups by brand and prefers variant purchase cost', async () => {
    const prisma = makePrisma([
      {
        id: 'inv-2',
        closedAt: new Date('2026-07-12T15:00:00.000Z'),
        issueDate: new Date('2026-07-12T15:00:00.000Z'),
        items: [
          {
            lineType: InvoiceLineType.PRODUCT,
            title: 'Oil',
            quantity: 1,
            unitPrice: 100,
            totalPrice: 100,
            productId: 'prod-3',
            product: {
              name: 'Oil',
              brand: 'PureBrand',
              unitPrice: 100,
              purchaseCost: 40,
              category: { name: 'Oils' },
            },
            variant: {
              id: 'var-1',
              purchaseCost: 25,
              price: 100,
            },
          },
        ],
      },
    ]);

    const provider = new CostOfGoodsProvider(prisma);
    const doc = await provider.generate(
      businessId,
      { ...filters, groupBy: 'brand' },
      context,
    );

    expect(doc.sections[0]!.columns[0]!.label).toBe('Brand/Product');

    const product = doc.sections[0]!.rows.find(
      (r) => r.depth === 1 && r.cells.label === 'Oil',
    )!;
    expect(product.cells.cost).toBe(25);
    expect(product.cells.profit).toBe(75);
    expect(product.cells.profitPercent).toBe(75);

    expect(
      doc.sections[0]!.rows.some(
        (r) => r.isGroup && r.cells.label === 'PureBrand',
      ),
    ).toBe(true);
  });

  it('returns zero totals when no costed products sold', async () => {
    const prisma = makePrisma([]);
    const provider = new CostOfGoodsProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);
    const total = doc.sections[0]!.rows.find((r) => r.isTotal)!;

    expect(total.cells.sales).toBe(0);
    expect(total.cells.cost).toBe(0);
    expect(total.cells.profit).toBe(0);
    expect(total.cells.profitPercent).toBe(0);
  });
});
