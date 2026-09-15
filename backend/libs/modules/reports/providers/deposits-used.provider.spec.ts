import { PayableType, PaymentStatus } from '@prisma/client';
import { DepositsUsedProvider } from './deposits-used.provider';

describe('DepositsUsedProvider', () => {
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

  function makePrisma(params: {
    sales?: unknown[];
    deposits?: unknown[];
  }) {
    return {
      invoice: {
        findMany: jest.fn().mockResolvedValue(params.sales ?? []),
      },
      payment: {
        findMany: jest.fn().mockResolvedValue(params.deposits ?? []),
      },
    } as never;
  }

  it('builds Mangomint-style columns with a total row', async () => {
    const prisma = makePrisma({
      sales: [
        {
          id: 'inv-1',
          displaySequence: 42,
          closedAt: new Date('2026-07-15T18:00:00.000Z'),
          issueDate: new Date('2026-07-15T18:00:00.000Z'),
          appointmentId: 'appt-1',
          contact: {
            displayName: 'Jane Client',
            firstName: 'Jane',
            lastName: 'Client',
          },
        },
      ],
      deposits: [
        {
          id: 'dep-1',
          amount: 75,
          invoiceId: 'inv-1',
          payableId: 'appt-1',
          contact: {
            displayName: 'Jane Client',
            firstName: 'Jane',
            lastName: 'Client',
          },
        },
      ],
    });

    const provider = new DepositsUsedProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);

    expect(doc.meta.description).toContain('associated sale date');

    const section = doc.sections[0]!;
    expect(section.columns.map((column) => column.key)).toEqual([
      'saleDate',
      'saleNumber',
      'client',
      'depositAmount',
    ]);

    const dataRow = section.rows.find((entry) => !entry.isTotal)!;
    expect(dataRow.cells.saleNumber).toBe('42');
    expect(dataRow.cells.client).toBe('Jane Client');
    expect(dataRow.cells.depositAmount).toBe(75);

    const total = section.rows.find((entry) => entry.isTotal)!;
    expect(total.cells.saleDate).toBe('Total');
    expect(total.cells.depositAmount).toBe(75);
  });

  it('matches deposits by appointment when invoiceId differs', async () => {
    const prisma = makePrisma({
      sales: [
        {
          id: 'inv-sale',
          displaySequence: 7,
          closedAt: new Date('2026-07-20T12:00:00.000Z'),
          issueDate: new Date('2026-07-20T12:00:00.000Z'),
          appointmentId: 'appt-9',
          contact: {
            displayName: 'Sam Guest',
            firstName: 'Sam',
            lastName: 'Guest',
          },
        },
      ],
      deposits: [
        {
          id: 'dep-9',
          amount: 40,
          invoiceId: 'inv-other',
          payableId: 'appt-9',
          contact: {
            displayName: 'Sam Guest',
            firstName: 'Sam',
            lastName: 'Guest',
          },
        },
      ],
    });

    const provider = new DepositsUsedProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);
    const dataRow = doc.sections[0]!.rows.find((entry) => !entry.isTotal)!;

    expect(dataRow.cells.saleNumber).toBe('7');
    expect(dataRow.cells.depositAmount).toBe(40);
  });

  it('loads closed appointment sales then booking deposits', async () => {
    const prisma = makePrisma({ sales: [], deposits: [] });
    const provider = new DepositsUsedProvider(prisma);
    await provider.generate(businessId, filters, context);

    expect(prisma.invoice.findMany).toHaveBeenCalled();
    expect(prisma.payment.findMany).not.toHaveBeenCalled();
  });

  it('queries booking deposits for closed sales in the period', async () => {
    const prisma = makePrisma({
      sales: [
        {
          id: 'inv-1',
          displaySequence: 1,
          closedAt: new Date('2026-07-10T12:00:00.000Z'),
          issueDate: new Date('2026-07-10T12:00:00.000Z'),
          appointmentId: 'appt-1',
          contact: {
            displayName: 'A',
            firstName: 'A',
            lastName: 'B',
          },
        },
      ],
      deposits: [],
    });
    const provider = new DepositsUsedProvider(prisma);
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
