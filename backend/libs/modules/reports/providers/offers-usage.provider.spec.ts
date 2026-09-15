import { OffersUsageProvider } from './offers-usage.provider';

describe('OffersUsageProvider', () => {
  const businessId = 'biz-1';
  const context = {
    businessName: 'Acme Dental',
    timezone: 'America/New_York',
    currency: 'USD',
    generatedAt: new Date('2026-07-18T23:00:00.000Z'),
  };

  const filters = {
    dateRange: 'custom',
    fromDate: '2026-06-01',
    toDate: '2026-06-30',
    offerId: 'offer-1',
  };

  function makePrisma(logs: unknown[], sales: unknown[] = []) {
    return {
      offerUsageLog: {
        findMany: jest.fn().mockResolvedValue(logs),
      },
      invoice: {
        findMany: jest.fn().mockResolvedValue(sales),
      },
    } as never;
  }

  it('builds Mangomint-style columns with sale totals and a total row', async () => {
    const prisma = makePrisma(
      [
        {
          id: 'log-1',
          saleId: 'sale-1',
          usedAt: new Date('2026-06-15T16:00:00.000Z'),
          discountAmount: 20,
          offer: { name: 'New_offer' },
          contact: {
            displayName: 'Jane Client',
            firstName: 'Jane',
            lastName: 'Client',
          },
        },
      ],
      [
        {
          id: 'sale-1',
          displaySequence: 1042,
          totalAmount: 80,
        },
      ],
    );

    const provider = new OffersUsageProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);

    const section = doc.sections[0]!;
    expect(section.columns.map((column) => column.key)).toEqual([
      'saleNumber',
      'date',
      'client',
      'offer',
      'saleTotalBefore',
      'appliedDiscount',
      'saleTotalAfter',
    ]);

    const dataRow = section.rows.find((entry) => !entry.isTotal)!;
    expect(dataRow.cells.saleNumber).toBe('1042');
    expect(dataRow.cells.client).toBe('Jane Client');
    expect(dataRow.cells.offer).toBe('New_offer');
    expect(dataRow.cells.saleTotalBefore).toBe(100);
    expect(dataRow.cells.appliedDiscount).toBe(20);
    expect(dataRow.cells.saleTotalAfter).toBe(80);

    const total = section.rows.find((entry) => entry.isTotal)!;
    expect(total.cells.saleNumber).toBe('Total');
    expect(total.cells.saleTotalBefore).toBe(100);
    expect(total.cells.appliedDiscount).toBe(20);
    expect(total.cells.saleTotalAfter).toBe(80);
  });

  it('returns an empty usage section when no offer is selected', async () => {
    const prisma = makePrisma([]);
    const provider = new OffersUsageProvider(prisma);
    const doc = await provider.generate(
      businessId,
      { ...filters, offerId: '' },
      context,
    );

    expect(prisma.offerUsageLog.findMany).not.toHaveBeenCalled();
    expect(doc.sections[0]!.rows).toEqual([]);
  });
});
