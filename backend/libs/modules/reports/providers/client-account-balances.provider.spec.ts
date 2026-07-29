import { ClientAccountBalancesProvider } from './client-account-balances.provider';

describe('ClientAccountBalancesProvider', () => {
  const businessId = 'biz-1';
  const context = {
    businessName: 'Acme Dental',
    timezone: 'America/New_York',
    currency: 'USD',
    generatedAt: new Date('2026-07-20T12:00:00.000Z'),
  };

  function makePrisma(grouped: unknown[], contacts: unknown[] = []) {
    return {
      contactWalletTransaction: {
        groupBy: jest.fn().mockResolvedValue(grouped),
      },
      contact: {
        findMany: jest.fn().mockResolvedValue(contacts),
      },
    } as never;
  }

  it('computes balances from transactions as of the selected day', async () => {
    const prisma = makePrisma(
      [
        { contactId: 'contact-1', _sum: { amount: 75 } },
        { contactId: 'contact-2', _sum: { amount: 25 } },
      ],
      [
        {
          id: 'contact-1',
          displayName: 'Jane Client',
          firstName: 'Jane',
          lastName: 'Client',
        },
        {
          id: 'contact-2',
          displayName: 'Ch. Messi',
          firstName: 'Lionel',
          lastName: 'Messi',
        },
      ],
    );

    const provider = new ClientAccountBalancesProvider(prisma);
    const doc = await provider.generate(
      businessId,
      { asOfDate: '2026-07-03' },
      context,
    );

    expect(prisma.contactWalletTransaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          businessId,
          createdAt: expect.objectContaining({ lte: expect.any(Date) }),
        }),
      }),
    );
    expect(doc.meta.periodLabel).toContain('July 3, 2026');

    const section = doc.sections[0]!;
    expect(section.columns.map((column) => column.key)).toEqual([
      'client',
      'amount',
    ]);

    const dataRows = section.rows.filter((entry) => !entry.isTotal);
    expect(dataRows).toHaveLength(2);
    expect(dataRows[0]!.cells.client).toBe('Ch. Messi');
    expect(dataRows[1]!.cells.client).toBe('Jane Client');

    const total = section.rows.find((entry) => entry.isTotal)!;
    expect(total.cells.amount).toBe(100);
  });

  it('excludes clients with a zero balance at end of day', async () => {
    const prisma = makePrisma(
      [
        { contactId: 'contact-1', _sum: { amount: 0 } },
        { contactId: 'contact-2', _sum: { amount: 40 } },
      ],
      [
        {
          id: 'contact-2',
          displayName: 'Jane Client',
          firstName: 'Jane',
          lastName: 'Client',
        },
      ],
    );

    const provider = new ClientAccountBalancesProvider(prisma);
    const doc = await provider.generate(
      businessId,
      { asOfDate: '2026-07-03' },
      context,
    );

    expect(doc.sections[0]!.rows.filter((entry) => !entry.isTotal)).toHaveLength(1);
    expect(doc.sections[0]!.rows.find((entry) => entry.isTotal)!.cells.amount).toBe(40);
  });
});
