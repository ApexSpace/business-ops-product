import { ProductInventoryAdjustmentType } from '@prisma/client';
import {
  ProductInventoryProvider,
  stockAtEndOfDay,
} from './product-inventory.provider';

describe('stockAtEndOfDay', () => {
  const asOf = new Date('2026-07-20T23:59:59.999Z');

  it('reverses post-cutoff deltas from current stock', () => {
    const stock = stockAtEndOfDay(
      10,
      [
        {
          productId: 'p1',
          type: ProductInventoryAdjustmentType.RECEIVED,
          quantityChange: 5,
          createdAt: new Date('2026-07-21T10:00:00.000Z'),
        },
        {
          productId: 'p1',
          type: ProductInventoryAdjustmentType.SALE,
          quantityChange: -2,
          createdAt: new Date('2026-07-22T10:00:00.000Z'),
        },
      ],
      asOf,
    );
    // current 10 = asOf + 5 - 2 → asOf = 7
    expect(stock).toBe(7);
  });

  it('replays through recounts when a recount happens after the cutoff', () => {
    const stock = stockAtEndOfDay(
      12,
      [
        {
          productId: 'p1',
          type: ProductInventoryAdjustmentType.RECEIVED,
          quantityChange: 10,
          createdAt: new Date('2026-07-01T10:00:00.000Z'),
        },
        {
          productId: 'p1',
          type: ProductInventoryAdjustmentType.SALE,
          quantityChange: -3,
          createdAt: new Date('2026-07-10T10:00:00.000Z'),
        },
        {
          productId: 'p1',
          type: ProductInventoryAdjustmentType.RECOUNT,
          quantityChange: 12,
          createdAt: new Date('2026-07-25T10:00:00.000Z'),
        },
      ],
      asOf,
    );
    // Through asOf: received 10, sold 3 → 7 (baseline 0)
    expect(stock).toBe(7);
  });
});

describe('ProductInventoryProvider', () => {
  const businessId = 'biz-1';
  const context = {
    businessName: 'Acme Spa',
    timezone: 'UTC',
    currency: 'USD',
    generatedAt: new Date('2026-07-20T12:00:00.000Z'),
  };

  function makePrisma(params: {
    products?: unknown[];
    adjustments?: unknown[];
  }) {
    return {
      product: {
        findMany: jest.fn().mockResolvedValue(params.products ?? []),
      },
      productInventoryAdjustment: {
        findMany: jest.fn().mockResolvedValue(params.adjustments ?? []),
      },
    } as never;
  }

  it('builds Mangomint columns with included and excluded sections', async () => {
    const prisma = makePrisma({
      products: [
        {
          id: 'prod-1',
          name: 'Body Wash',
          brand: 'CleanCo',
          stockQuantity: 10,
          purchaseCost: 5,
          unitPrice: 15,
          considerAsSalesRevenue: true,
          category: { name: 'Bath & Body' },
        },
        {
          id: 'prod-2',
          name: 'Backbar Toner',
          brand: 'ProLine',
          stockQuantity: 4,
          purchaseCost: 8,
          unitPrice: 0,
          considerAsSalesRevenue: false,
          category: { name: 'Skin Care' },
        },
      ],
      adjustments: [],
    });

    const provider = new ProductInventoryProvider(prisma);
    const doc = await provider.generate(
      businessId,
      { asOfDate: '2026-07-20', groupBy: 'category' },
      context,
    );

    expect(doc.meta.periodLabel).toBe('At End Of Day: Jul 20, 2026');
    expect(doc.sections.map((s) => s.id)).toEqual(['inventory', 'excluded']);
    expect(doc.sections[1]!.title).toBe('Excluded from revenue:');
    expect(doc.sections[0]!.columns.map((c) => c.key)).toEqual([
      'label',
      'stock',
      'costValue',
      'retailValue',
    ]);
    expect(doc.sections[0]!.columns[0]!.label).toBe(
      'Product Category/Product',
    );

    const included = doc.sections[0]!;
    const product = included.rows.find(
      (r) => r.depth === 1 && r.cells.label === 'Body Wash',
    )!;
    expect(product.cells.stock).toBe(10);
    expect(product.cells.costValue).toBe(50);
    expect(product.cells.retailValue).toBe(150);

    const group = included.rows.find(
      (r) => r.isGroup && r.cells.label === 'Bath & Body',
    )!;
    expect(group.cells.stock).toBe(10);

    const total = included.rows.find((r) => r.isTotal)!;
    expect(total.cells.stock).toBe(10);
    expect(total.cells.costValue).toBe(50);
    expect(total.cells.retailValue).toBe(150);

    const excludedProduct = doc.sections[1]!.rows.find(
      (r) => r.depth === 1 && r.cells.label === 'Backbar Toner',
    )!;
    expect(excludedProduct.cells.stock).toBe(4);
    expect(excludedProduct.cells.costValue).toBe(32);
  });

  it('applies historical stock for the selected end-of-day date', async () => {
    const prisma = makePrisma({
      products: [
        {
          id: 'prod-1',
          name: 'Serum',
          brand: 'SkinLab',
          stockQuantity: 8,
          purchaseCost: 10,
          unitPrice: 40,
          considerAsSalesRevenue: true,
          category: { name: 'Skin Care' },
        },
      ],
      adjustments: [
        {
          productId: 'prod-1',
          type: ProductInventoryAdjustmentType.SALE,
          quantityChange: -2,
          createdAt: new Date('2026-07-21T12:00:00.000Z'),
        },
      ],
    });

    const provider = new ProductInventoryProvider(prisma);
    const doc = await provider.generate(
      businessId,
      { asOfDate: '2026-07-20', groupBy: 'brand' },
      context,
    );

    expect(doc.sections[0]!.columns[0]!.label).toBe('Brand/Product');
    const product = doc.sections[0]!.rows.find(
      (r) => r.depth === 1 && r.cells.label === 'Serum',
    )!;
    // Current 8; sale of 2 happened after as-of → stock at as-of was 10
    expect(product.cells.stock).toBe(10);
    expect(product.cells.costValue).toBe(100);
    expect(product.cells.retailValue).toBe(400);
  });
});
