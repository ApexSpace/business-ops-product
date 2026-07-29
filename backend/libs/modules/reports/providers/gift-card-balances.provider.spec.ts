import { GiftCardBalancesProvider } from './gift-card-balances.provider';

describe('GiftCardBalancesProvider', () => {
  const businessId = 'biz-1';
  const context = {
    businessName: 'Acme Spa',
    timezone: 'America/New_York',
    currency: 'USD',
    generatedAt: new Date('2026-07-20T12:00:00.000Z'),
  };

  function makePrisma(grouped: unknown[], cards: unknown[] = []) {
    return {
      giftCardTransaction: {
        groupBy: jest.fn().mockResolvedValue(grouped),
      },
      giftCard: {
        findMany: jest.fn().mockResolvedValue(cards),
      },
    } as never;
  }

  it('computes balances from transactions as of the selected day', async () => {
    const prisma = makePrisma(
      [
        { giftCardId: 'gc-1', _sum: { amount: 100 } },
        { giftCardId: 'gc-2', _sum: { amount: 40 } },
      ],
      [
        {
          id: 'gc-1',
          number: 'GC-1001',
          createdAt: new Date('2026-06-01T12:00:00.000Z'),
          ownerContact: {
            displayName: 'Jane Client',
            firstName: 'Jane',
            lastName: 'Client',
          },
          purchasingContact: {
            displayName: 'John Buyer',
            firstName: 'John',
            lastName: 'Buyer',
          },
        },
        {
          id: 'gc-2',
          number: 'GC-1002',
          createdAt: new Date('2026-06-15T12:00:00.000Z'),
          ownerContact: {
            displayName: 'Alex Owner',
            firstName: 'Alex',
            lastName: 'Owner',
          },
          purchasingContact: null,
        },
      ],
    );

    const provider = new GiftCardBalancesProvider(prisma);
    const doc = await provider.generate(
      businessId,
      { asOfDate: '2026-07-20' },
      context,
    );

    expect(prisma.giftCardTransaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          businessId,
          createdAt: expect.objectContaining({ lte: expect.any(Date) }),
        }),
      }),
    );
    expect(doc.meta.periodLabel).toContain('July 20, 2026');
    expect(doc.meta.description).toBe('Shows outstanding gift card balances.');

    const section = doc.sections[0]!;
    expect(section.columns.map((column) => column.key)).toEqual([
      'giftCardNumber',
      'purchaser',
      'owner',
      'purchasedFor',
      'amount',
    ]);

    const dataRows = section.rows.filter((entry) => !entry.isTotal);
    expect(dataRows).toHaveLength(2);
    expect(dataRows[0]!.cells.giftCardNumber).toBe('GC-1001');
    expect(dataRows[0]!.cells.purchaser).toBe('John Buyer');
    expect(dataRows[0]!.cells.owner).toBe('Jane Client');
    expect(dataRows[0]!.cells.purchasedFor).toBe('Jane Client');
    expect(dataRows[0]!.cells.amount).toBe(100);

    const total = section.rows.find((entry) => entry.isTotal)!;
    expect(total.cells.giftCardNumber).toBe('Total');
    expect(total.cells.amount).toBe(140);
  });

  it('excludes gift cards with a zero balance at end of day', async () => {
    const prisma = makePrisma(
      [
        { giftCardId: 'gc-1', _sum: { amount: 0 } },
        { giftCardId: 'gc-2', _sum: { amount: 25 } },
      ],
      [
        {
          id: 'gc-1',
          number: 'GC-ZERO',
          createdAt: new Date('2026-06-01T12:00:00.000Z'),
          ownerContact: {
            displayName: 'Zero Card',
            firstName: 'Zero',
            lastName: 'Card',
          },
          purchasingContact: null,
        },
        {
          id: 'gc-2',
          number: 'GC-ACTIVE',
          createdAt: new Date('2026-06-01T12:00:00.000Z'),
          ownerContact: {
            displayName: 'Active Owner',
            firstName: 'Active',
            lastName: 'Owner',
          },
          purchasingContact: null,
        },
      ],
    );

    const provider = new GiftCardBalancesProvider(prisma);
    const doc = await provider.generate(
      businessId,
      { asOfDate: '2026-07-20' },
      context,
    );

    const dataRows = doc.sections[0]!.rows.filter((entry) => !entry.isTotal);
    expect(dataRows).toHaveLength(1);
    expect(dataRows[0]!.cells.giftCardNumber).toBe('GC-ACTIVE');
    expect(doc.sections[0]!.rows.find((entry) => entry.isTotal)!.cells.amount).toBe(
      25,
    );
  });
});
