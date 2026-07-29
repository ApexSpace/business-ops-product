import { PayableType, PaymentStatus } from '@prisma/client';
import { DepositsCollectedProvider } from './deposits-collected.provider';

describe('DepositsCollectedProvider', () => {
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

  function makePrisma(payments: unknown[]) {
    return {
      payment: {
        findMany: jest.fn().mockResolvedValue(payments),
      },
    } as never;
  }

  it('builds Mangomint-style deposit columns with a total row', async () => {
    const prisma = makePrisma([
      {
        id: 'pay-1',
        amount: 50,
        paidAt: new Date('2026-07-10T16:00:00.000Z'),
        createdAt: new Date('2026-07-10T16:00:00.000Z'),
        contact: {
          displayName: 'Jane Client',
          firstName: 'Jane',
          lastName: 'Client',
        },
        invoice: { displaySequence: 12 },
      },
    ]);

    const provider = new DepositsCollectedProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);

    expect(doc.meta.description).toContain('Express Booking');

    const section = doc.sections[0]!;
    expect(section.columns.map((column) => column.key)).toEqual([
      'paymentDate',
      'saleNumber',
      'client',
      'depositAmount',
    ]);

    const dataRow = section.rows.find((entry) => !entry.isTotal)!;
    expect(dataRow.cells.saleNumber).toBe('12');
    expect(dataRow.cells.client).toBe('Jane Client');
    expect(dataRow.cells.depositAmount).toBe(50);

    const total = section.rows.find((entry) => entry.isTotal)!;
    expect(total.cells.paymentDate).toBe('Total');
    expect(total.cells.depositAmount).toBe(50);
  });

  it('loads booking deposit payments in the selected period', async () => {
    const prisma = makePrisma([]);
    const provider = new DepositsCollectedProvider(prisma);
    await provider.generate(businessId, filters, context);

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          payableType: PayableType.BOOKING_DEPOSIT,
          status: PaymentStatus.SUCCEEDED,
        }),
      }),
    );
  });
});
