import {
  InvoiceLineType,
  ProductInventoryAdjustmentType,
} from '@prisma/client';
import { ProductStockUsageProvider } from './product-stock-usage.provider';

describe('ProductStockUsageProvider', () => {
  const businessId = 'biz-1';
  const context = {
    businessName: 'Acme Spa',
    timezone: 'UTC',
    currency: 'USD',
    generatedAt: new Date('2026-07-20T12:00:00.000Z'),
  };

  const filters = {
    dateRange: 'custom',
    fromDate: '2026-07-01',
    toDate: '2026-07-31',
    groupBy: 'category',
    brand: 'all',
  };

  function makePrisma(params: {
    products?: unknown[];
    invoices?: unknown[];
    adjustments?: unknown[];
  }) {
    return {
      product: {
        findMany: jest.fn().mockResolvedValue(params.products ?? []),
      },
      invoice: {
        findMany: jest.fn().mockResolvedValue(params.invoices ?? []),
      },
      productInventoryAdjustment: {
        findMany: jest.fn().mockResolvedValue(params.adjustments ?? []),
      },
    } as never;
  }

  it('builds Mangomint columns with totals and end stock', async () => {
    const prisma = makePrisma({
      products: [
        {
          id: 'prod-1',
          name: 'Body Wash',
          brand: 'CleanCo',
          stockQuantity: 20,
          category: { name: 'Bath & Body' },
        },
      ],
      invoices: [
        {
          id: 'inv-1',
          closedAt: new Date('2026-07-10T12:00:00.000Z'),
          issueDate: new Date('2026-07-10T12:00:00.000Z'),
          items: [
            {
              lineType: InvoiceLineType.PRODUCT,
              productId: 'prod-1',
              title: 'Body Wash',
              quantity: 3,
              unitPrice: 15,
              totalPrice: 45,
              product: {
                name: 'Body Wash',
                brand: 'CleanCo',
                unitPrice: 15,
                purchaseCost: 5,
                category: { name: 'Bath & Body' },
              },
              variant: null,
            },
          ],
        },
      ],
      adjustments: [
        {
          productId: 'prod-1',
          type: ProductInventoryAdjustmentType.PROFESSIONAL_USE,
          quantityChange: -2,
          serviceId: null,
          createdAt: new Date('2026-07-12T12:00:00.000Z'),
        },
        {
          productId: 'prod-1',
          type: ProductInventoryAdjustmentType.OTHER,
          quantityChange: -1,
          serviceId: 'svc-1',
          createdAt: new Date('2026-07-15T12:00:00.000Z'),
        },
        // After period end — should reduce current stock when reconstructing end stock
        {
          productId: 'prod-1',
          type: ProductInventoryAdjustmentType.SALE,
          quantityChange: -4,
          serviceId: null,
          createdAt: new Date('2026-08-02T12:00:00.000Z'),
        },
      ],
    });

    const provider = new ProductStockUsageProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);

    expect(doc.sections[0]!.columns.map((c) => c.key)).toEqual([
      'label',
      'productsSold',
      'professionalUse',
      'serviceUsage',
      'totalUsage',
      'endStock',
    ]);
    expect(doc.sections[0]!.columns[0]!.label).toBe(
      'Product Category/Product',
    );

    const product = doc.sections[0]!.rows.find(
      (r) => r.depth === 1 && r.cells.label === 'Body Wash',
    )!;
    expect(product.cells.productsSold).toBe(3);
    expect(product.cells.professionalUse).toBe(2);
    expect(product.cells.serviceUsage).toBe(1);
    expect(product.cells.totalUsage).toBe(6);
    // current 20; sale -4 after period → end of July was 24
    expect(product.cells.endStock).toBe(24);

    const total = doc.sections[0]!.rows.find((r) => r.isTotal)!;
    expect(total.cells.totalUsage).toBe(6);
  });

  it('filters by brand and groups by brand', async () => {
    const prisma = makePrisma({
      products: [],
      invoices: [],
      adjustments: [],
    });
    const provider = new ProductStockUsageProvider(prisma);
    await provider.generate(
      businessId,
      { ...filters, groupBy: 'brand', brand: 'SkinLab' },
      context,
    );

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          brand: 'SkinLab',
        }),
      }),
    );
  });

  it('does not double-count SALE adjustments as products sold', async () => {
    const prisma = makePrisma({
      products: [
        {
          id: 'prod-1',
          name: 'Serum',
          brand: 'SkinLab',
          stockQuantity: 5,
          category: { name: 'Skin Care' },
        },
      ],
      invoices: [
        {
          id: 'inv-1',
          closedAt: new Date('2026-07-05T12:00:00.000Z'),
          issueDate: new Date('2026-07-05T12:00:00.000Z'),
          items: [
            {
              lineType: InvoiceLineType.PRODUCT,
              productId: 'prod-1',
              title: 'Serum',
              quantity: 2,
              unitPrice: 40,
              totalPrice: 80,
              product: {
                name: 'Serum',
                brand: 'SkinLab',
                unitPrice: 40,
                purchaseCost: 10,
                category: { name: 'Skin Care' },
              },
              variant: null,
            },
          ],
        },
      ],
      adjustments: [
        {
          productId: 'prod-1',
          type: ProductInventoryAdjustmentType.SALE,
          quantityChange: -2,
          serviceId: null,
          createdAt: new Date('2026-07-05T12:05:00.000Z'),
        },
      ],
    });

    const provider = new ProductStockUsageProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);
    const product = doc.sections[0]!.rows.find(
      (r) => r.depth === 1 && r.cells.label === 'Serum',
    )!;

    expect(product.cells.productsSold).toBe(2);
    expect(product.cells.totalUsage).toBe(2);
  });
});
