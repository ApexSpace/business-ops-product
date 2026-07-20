import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { GiftCardUsageProvider } from './gift-card-usage.provider';

describe('GiftCardUsageProvider', () => {
  const businessId = 'biz-1';
  const context = {
    businessName: 'Acme Spa',
    timezone: 'America/New_York',
    currency: 'USD',
    generatedAt: new Date('2026-05-20T12:00:00.000Z'),
  };

  const filters = {
    dateRange: 'custom',
    fromDate: '2026-05-01',
    toDate: '2026-05-31',
  };

  function makePrisma(params: {
    periodPayments?: unknown[];
    allUsagePayments?: unknown[];
  }) {
    return {
      payment: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce(params.periodPayments ?? [])
          .mockResolvedValueOnce(params.allUsagePayments ?? []),
      },
    } as never;
  }

  it('builds Mangomint-style columns with totals and staff members', async () => {
    const prisma = makePrisma({
      periodPayments: [
        {
          id: 'pay-1',
          amount: 75,
          paidAt: new Date('2026-05-15T16:00:00.000Z'),
          createdAt: new Date('2026-05-15T16:00:00.000Z'),
          giftCardId: 'gc-1',
          giftCard: {
            id: 'gc-1',
            number: 'GC-1001',
            createdAt: new Date('2026-04-01T16:00:00.000Z'),
          },
          invoice: {
            displaySequence: 42,
            closedAt: new Date('2026-05-15T16:00:00.000Z'),
            issueDate: new Date('2026-05-15T16:00:00.000Z'),
            items: [
              {
                staffUser: { firstName: 'Alex', lastName: 'Smith' },
              },
              {
                staffUser: { firstName: 'Jamie', lastName: 'Lee' },
              },
            ],
          },
        },
      ],
      allUsagePayments: [
        {
          giftCardId: 'gc-1',
          paidAt: new Date('2026-05-15T16:00:00.000Z'),
          createdAt: new Date('2026-05-15T16:00:00.000Z'),
          invoice: {
            closedAt: new Date('2026-05-15T16:00:00.000Z'),
            issueDate: new Date('2026-05-15T16:00:00.000Z'),
          },
        },
      ],
    });

    const provider = new GiftCardUsageProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);

    const usage = doc.sections[0]!;
    expect(usage.columns.map((column) => column.key)).toEqual([
      'date',
      'saleNumber',
      'giftCardNumber',
      'createdDate',
      'lastSaleDate',
      'amount',
      'serviceStaffMembers',
    ]);

    const dataRow = usage.rows.find((entry) => !entry.isTotal)!;
    expect(dataRow.cells.saleNumber).toBe('42');
    expect(dataRow.cells.giftCardNumber).toBe('GC-1001');
    expect(dataRow.cells.amount).toBe(75);
    expect(dataRow.cells.serviceStaffMembers).toBe('Alex Smith, Jamie Lee');

    const total = usage.rows.find((entry) => entry.isTotal)!;
    expect(total.cells.date).toBe('Total');
    expect(total.cells.amount).toBe(75);
  });

  it('loads gift card payments for usage rows', async () => {
    const prisma = makePrisma({ periodPayments: [], allUsagePayments: [] });
    const provider = new GiftCardUsageProvider(prisma);
    await provider.generate(businessId, filters, context);

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          method: PaymentMethod.GIFT_CARD,
          status: PaymentStatus.SUCCEEDED,
        }),
      }),
    );
  });
});
