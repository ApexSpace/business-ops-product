import { OffersSummaryProvider } from './offers-summary.provider';

describe('OffersSummaryProvider', () => {
  const businessId = 'biz-1';
  const context = {
    businessName: 'Acme Dental',
    timezone: 'America/New_York',
    currency: 'USD',
    generatedAt: new Date('2026-07-18T23:00:00.000Z'),
  };

  const filters = {
    dateRange: 'custom',
    fromDate: '2026-07-01',
    toDate: '2026-07-31',
  };

  function makePrisma(logs: unknown[]) {
    return {
      offerUsageLog: {
        findMany: jest.fn().mockResolvedValue(logs),
      },
    } as never;
  }

  it('builds Mangomint-style per-offer summary columns with a total row', async () => {
    const prisma = makePrisma([
      {
        offerId: 'offer-1',
        discountAmount: 15,
        offer: { name: 'New_offer', offerCode: 'SUMMER15' },
      },
      {
        offerId: 'offer-1',
        discountAmount: 5,
        offer: { name: 'New_offer', offerCode: 'SUMMER15' },
      },
      {
        offerId: 'offer-2',
        discountAmount: 10,
        offer: { name: 'Event offer', offerCode: null },
      },
    ]);

    const provider = new OffersSummaryProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);

    const section = doc.sections[0]!;
    expect(section.columns.map((column) => column.key)).toEqual([
      'offer',
      'code',
      'usedCount',
      'discounts',
    ]);

    const offerRows = section.rows.filter((entry) => !entry.isTotal);
    expect(offerRows).toHaveLength(2);
    expect(offerRows[0]!.cells).toMatchObject({
      offer: 'Event offer',
      code: null,
      usedCount: 1,
      discounts: 10,
    });
    expect(offerRows[1]!.cells).toMatchObject({
      offer: 'New_offer',
      code: 'SUMMER15',
      usedCount: 2,
      discounts: 20,
    });

    const total = section.rows.find((entry) => entry.isTotal)!;
    expect(total.cells.offer).toBe('Total');
    expect(total.cells.code).toBe('');
    expect(total.cells.usedCount).toBe(3);
    expect(total.cells.discounts).toBe(30);
  });

  it('returns only a total row when there is no usage', async () => {
    const prisma = makePrisma([]);
    const provider = new OffersSummaryProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);

    expect(doc.sections[0]!.rows).toHaveLength(1);
    expect(doc.sections[0]!.rows[0]!.cells).toMatchObject({
      offer: 'Total',
      code: '',
      usedCount: 0,
      discounts: 0,
    });
  });
});
