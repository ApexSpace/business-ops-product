import { ContactWalletTransactionType, PaymentMethod, PaymentStatus } from '@prisma/client';
import { ClientAccountUsageProvider } from './client-account-usage.provider';

describe('ClientAccountUsageProvider', () => {
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
  };

  function makePrisma(params: {
    payments?: unknown[];
    walletTxns?: unknown[];
  }) {
    return {
      payment: {
        findMany: jest.fn().mockResolvedValue(params.payments ?? []),
      },
      contactWalletTransaction: {
        findMany: jest.fn().mockResolvedValue(params.walletTxns ?? []),
      },
    } as never;
  }

  it('builds rows from wallet payments with sale numbers', async () => {
    const prisma = makePrisma({
      payments: [
        {
          id: 'pay-1',
          amount: 50,
          paidAt: new Date('2026-06-20T16:00:00.000Z'),
          createdAt: new Date('2026-06-20T16:00:00.000Z'),
          contact: {
            displayName: 'Jane Client',
            firstName: 'Jane',
            lastName: 'Client',
          },
          invoice: { displaySequence: 1042 },
        },
      ],
    });

    const provider = new ClientAccountUsageProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);

    const section = doc.sections[0]!;
    expect(section.columns.map((column) => column.key)).toEqual([
      'date',
      'saleNumber',
      'client',
      'amount',
    ]);

    const dataRow = section.rows.find((entry) => !entry.isTotal)!;
    expect(dataRow.cells.saleNumber).toBe('1042');
    expect(dataRow.cells.client).toBe('Jane Client');
    expect(dataRow.cells.amount).toBe(50);

    const total = section.rows.find((entry) => entry.isTotal)!;
    expect(total.cells.amount).toBe(50);
  });

  it('falls back to orphan sale wallet ledger rows when payment rows are missing', async () => {
    const prisma = makePrisma({
      payments: [],
      walletTxns: [
        {
          id: 'txn-1',
          amount: -34,
          createdAt: new Date('2026-06-24T16:00:00.000Z'),
          contact: {
            displayName: 'Shahbaz Baig',
            firstName: 'Shahbaz',
            lastName: 'Baig',
          },
          invoice: { displaySequence: 99 },
          payment: null,
        },
      ],
    });

    const provider = new ClientAccountUsageProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);

    const dataRow = doc.sections[0]!.rows.find((entry) => !entry.isTotal)!;
    expect(dataRow.cells.saleNumber).toBe('99');
    expect(dataRow.cells.amount).toBe(34);
  });

  it('does not include manual wallet adjustments without a linked sale', async () => {
    const prisma = makePrisma({
      payments: [],
      walletTxns: [],
    });

    const provider = new ClientAccountUsageProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);

    expect(prisma.contactWalletTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: ContactWalletTransactionType.SALE_PAYMENT,
        }),
      }),
    );
    expect(doc.sections[0]!.rows).toHaveLength(1);
    expect(doc.sections[0]!.rows[0]!.cells.amount).toBe(0);
  });
});
