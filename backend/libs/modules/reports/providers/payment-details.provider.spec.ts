import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PaymentDetailsProvider } from './payment-details.provider';

describe('PaymentDetailsProvider', () => {
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
    succeeded?: unknown[];
    refunded?: unknown[];
  }) {
    return {
      payment: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce(params.succeeded ?? [])
          .mockResolvedValueOnce(params.refunded ?? []),
      },
    } as never;
  }

  it('builds Mangomint-style payment detail columns', async () => {
    const prisma = makePrisma({
      succeeded: [
        {
          id: 'pay-1',
          amount: 120,
          method: PaymentMethod.OTHER,
          status: PaymentStatus.SUCCEEDED,
          reference: 'REF-1',
          paidAt: new Date('2026-07-09T16:00:00.000Z'),
          createdAt: new Date('2026-07-09T16:00:00.000Z'),
          contact: {
            displayName: 'Jimmy Fletcher',
            firstName: 'Jimmy',
            lastName: 'Fletcher',
          },
          invoice: {
            displaySequence: 1,
            closedAt: new Date('2026-07-09T16:00:00.000Z'),
            issueDate: new Date('2026-07-09T16:00:00.000Z'),
            totalAmount: 120,
            closedBy: { firstName: 'Jennifer', lastName: null },
            createdBy: null,
            items: [
              {
                staffUser: { firstName: 'Jennifer', lastName: null },
              },
            ],
          },
        },
      ],
    });

    const provider = new PaymentDetailsProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);

    const section = doc.sections[0]!;
    expect(section.columns.map((column) => column.key)).toEqual([
      'saleNumber',
      'paymentDate',
      'saleDate',
      'client',
      'staffMembers',
      'amount',
      'paymentMethod',
      'saleTotal',
      'reference',
    ]);

    const dataRow = section.rows.find((entry) => !entry.isTotal)!;
    expect(dataRow.cells.saleNumber).toBe('1');
    expect(dataRow.cells.client).toBe('Jimmy Fletcher');
    expect(dataRow.cells.staffMembers).toBe('Jennifer');
    expect(dataRow.cells.amount).toBe(120);
    expect(dataRow.cells.paymentMethod).toBe('Other');
    expect(dataRow.cells.saleTotal).toBe(120);
    expect(dataRow.cells.reference).toBe('REF-1');
  });

  it('includes refunds as negative amounts', async () => {
    const prisma = makePrisma({
      refunded: [
        {
          id: 'pay-2',
          amount: 50,
          method: PaymentMethod.CASH,
          status: PaymentStatus.REFUNDED,
          reference: null,
          stripeRefundId: null,
          providerMetadata: {
            refundedAt: '2026-07-12T16:00:00.000Z',
            amountRefunded: '50',
          },
          paidAt: new Date('2026-07-01T16:00:00.000Z'),
          createdAt: new Date('2026-07-01T16:00:00.000Z'),
          updatedAt: new Date('2026-07-12T16:00:00.000Z'),
          contact: {
            displayName: 'Jane Client',
            firstName: 'Jane',
            lastName: 'Client',
          },
          invoice: {
            displaySequence: 9,
            closedAt: new Date('2026-07-01T16:00:00.000Z'),
            issueDate: new Date('2026-07-01T16:00:00.000Z'),
            totalAmount: 50,
            closedBy: null,
            createdBy: null,
            items: [],
          },
        },
      ],
    });

    const provider = new PaymentDetailsProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);
    const refundRow = doc.sections[0]!.rows.find((entry) => !entry.isTotal)!;

    expect(refundRow.cells.amount).toBe(-50);
    expect(refundRow.cells.saleNumber).toBe('9');
  });
});
