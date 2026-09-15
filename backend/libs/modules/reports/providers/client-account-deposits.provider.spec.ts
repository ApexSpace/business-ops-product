import {
  ContactWalletTransactionType,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';
import { ClientAccountDepositsProvider } from './client-account-deposits.provider';

describe('ClientAccountDepositsProvider', () => {
  const businessId = 'biz-1';
  const context = {
    businessName: 'Acme Dental',
    timezone: 'America/New_York',
    currency: 'USD',
    generatedAt: new Date('2026-07-20T12:00:00.000Z'),
  };

  const filters = {
    dateRange: 'custom',
    fromDate: '2026-07-01',
    toDate: '2026-07-31',
    filterRefundsBy: 'sale_date',
  };

  function makePrisma(params: {
    deposits?: unknown[];
    refundPayments?: unknown[];
    walletRefunds?: unknown[];
  }) {
    return {
      contactWalletTransaction: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce(params.deposits ?? [])
          .mockResolvedValueOnce(params.walletRefunds ?? []),
      },
      payment: {
        findMany: jest.fn().mockResolvedValue(params.refundPayments ?? []),
      },
    } as never;
  }

  it('builds Mangomint-style deposit and refund sections', async () => {
    const prisma = makePrisma({
      deposits: [
        {
          id: 'dep-1',
          amount: 50,
          createdAt: new Date('2026-07-10T16:00:00.000Z'),
          contact: {
            displayName: 'Ch. Messi',
            firstName: 'Lionel',
            lastName: 'Messi',
          },
          invoice: { displaySequence: 31 },
        },
      ],
      refundPayments: [
        {
          id: 'pay-1',
          amount: 25,
          status: PaymentStatus.SUCCEEDED,
          stripeRefundId: null,
          providerMetadata: {
            refundedAt: '2026-07-15T16:00:00.000Z',
            amountRefunded: '25',
          },
          updatedAt: new Date('2026-07-15T16:00:00.000Z'),
          contact: {
            displayName: 'Jane Client',
            firstName: 'Jane',
            lastName: 'Client',
          },
          invoice: {
            displaySequence: 12,
            closedAt: new Date('2026-07-05T16:00:00.000Z'),
            issueDate: new Date('2026-07-05T16:00:00.000Z'),
          },
        },
      ],
    });

    const provider = new ClientAccountDepositsProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);

    expect(doc.meta.title).toBe('Client Account Balance Deposits');
    expect(doc.sections).toHaveLength(2);

    const deposits = doc.sections[0]!;
    expect(deposits.columns.map((column) => column.key)).toEqual([
      'date',
      'saleNumber',
      'client',
      'amount',
    ]);
    const depositRow = deposits.rows.find((entry) => !entry.isTotal)!;
    expect(depositRow.cells.saleNumber).toBe('31');
    expect(depositRow.cells.amount).toBe(50);

    const refunds = doc.sections[1]!;
    expect(refunds.title).toBe('Refunds');
    expect(refunds.columns.map((column) => column.key)).toEqual([
      'date',
      'refundNumber',
      'client',
      'refund',
    ]);
    const refundRow = refunds.rows.find((entry) => !entry.isTotal)!;
    expect(refundRow.cells.client).toBe('Jane Client');
    expect(refundRow.cells.refund).toBe(25);
  });

  it('loads wallet refunds for deposit-related payments', async () => {
    const prisma = makePrisma({ deposits: [], refundPayments: [], walletRefunds: [] });
    const provider = new ClientAccountDepositsProvider(prisma);
    await provider.generate(businessId, filters, context);

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          method: PaymentMethod.WALLET,
        }),
      }),
    );
    expect(prisma.contactWalletTransaction.findMany).toHaveBeenCalledTimes(2);
  });
});
