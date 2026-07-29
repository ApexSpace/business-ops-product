import { ProductInventoryAdjustmentType } from '@prisma/client';
import { ProductInventoryChangesProvider } from './product-inventory-changes.provider';

describe('ProductInventoryChangesProvider', () => {
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
  };

  function makePrisma(adjustments: unknown[]) {
    return {
      productInventoryAdjustment: {
        findMany: jest.fn().mockResolvedValue(adjustments),
      },
    } as never;
  }

  it('builds Mangomint columns and type labels', async () => {
    const prisma = makePrisma([
      {
        id: 'adj-1',
        type: ProductInventoryAdjustmentType.OTHER,
        quantityChange: 5,
        createdAt: new Date('2026-07-09T16:00:00.000Z'),
        product: { name: 'Peppermint Body Scrub', brand: 'CleanCo' },
        actor: { firstName: 'Alex', lastName: 'Admin' },
      },
      {
        id: 'adj-2',
        type: ProductInventoryAdjustmentType.RECEIVED,
        quantityChange: 8,
        createdAt: new Date('2026-07-09T18:00:00.000Z'),
        product: { name: 'SPF 30 Face Moisturizer', brand: 'SkinLab' },
        actor: { firstName: 'Sam', lastName: null },
      },
    ]);

    const provider = new ProductInventoryChangesProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);

    expect(doc.sections[0]!.columns.map((c) => c.key)).toEqual([
      'date',
      'product',
      'type',
      'stockChange',
      'staffMember',
    ]);

    const rows = doc.sections[0]!.rows;
    expect(rows[0]!.cells.product).toBe('Peppermint Body Scrub');
    expect(rows[0]!.cells.type).toBe('Stock adjustment');
    expect(rows[0]!.cells.stockChange).toBe(5);
    expect(rows[0]!.cells.staffMember).toBe('Alex Admin');
    expect(rows[0]!.cells.date).toMatch(/Jul 9/);

    expect(rows[1]!.cells.type).toBe('Received Stock');
    expect(rows[1]!.cells.staffMember).toBe('Sam');
  });

  it('filters by brand when not All', async () => {
    const prisma = makePrisma([]);
    const provider = new ProductInventoryChangesProvider(prisma);
    await provider.generate(
      businessId,
      { ...filters, brand: 'SkinLab' },
      context,
    );

    expect(prisma.productInventoryAdjustment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          product: expect.objectContaining({
            deletedAt: null,
            brand: 'SkinLab',
          }),
        }),
      }),
    );
  });

  it('does not filter brand when All is selected', async () => {
    const prisma = makePrisma([]);
    const provider = new ProductInventoryChangesProvider(prisma);
    await provider.generate(
      businessId,
      { ...filters, brand: 'all' },
      context,
    );

    expect(prisma.productInventoryAdjustment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          product: { deletedAt: null },
        }),
      }),
    );
  });
});
