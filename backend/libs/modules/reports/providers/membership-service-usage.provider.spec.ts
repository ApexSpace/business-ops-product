import { InvoiceLineType, InvoiceStatus } from '@prisma/client';
import { MembershipServiceUsageProvider } from './membership-service-usage.provider';

describe('MembershipServiceUsageProvider', () => {
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
    filterRefundsBy: 'sale_date',
  };

  function makePrisma(params: {
    invoices?: unknown[];
    memberships?: unknown[];
    refundPayments?: unknown[];
    refundMemberships?: unknown[];
  }) {
    return {
      invoice: {
        findMany: jest.fn().mockResolvedValue(params.invoices ?? []),
      },
      clientMembership: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce(params.memberships ?? [])
          .mockResolvedValueOnce(params.refundMemberships ?? []),
      },
      payment: {
        findMany: jest.fn().mockResolvedValue(params.refundPayments ?? []),
      },
    } as never;
  }

  it('builds Mangomint usage and refund sections', async () => {
    const prisma = makePrisma({
      invoices: [
        {
          id: 'inv-1',
          displaySequence: 55,
          closedAt: new Date('2026-07-10T16:00:00.000Z'),
          issueDate: new Date('2026-07-10T16:00:00.000Z'),
          contact: {
            displayName: 'Jane Client',
            firstName: 'Jane',
            lastName: 'Client',
          },
          items: [
            {
              id: 'item-1',
              title: 'Facial',
              quantity: 1,
              unitPrice: 0,
              metadata: {
                membershipRedemption: true,
                clientMembershipId: 'mem-1',
              },
              service: { id: 'svc-1', name: 'Facial', price: 80 },
            },
          ],
        },
      ],
      memberships: [
        {
          id: 'mem-1',
          plan: { name: 'VIP Membership' },
        },
      ],
      refundPayments: [
        {
          id: 'pay-1',
          amount: 80,
          status: 'REFUNDED',
          stripeRefundId: null,
          providerMetadata: {
            refundedAt: '2026-07-12T16:00:00.000Z',
            amountRefunded: '80',
          },
          updatedAt: new Date('2026-07-12T16:00:00.000Z'),
          invoice: {
            displaySequence: 55,
            closedAt: new Date('2026-07-10T16:00:00.000Z'),
            issueDate: new Date('2026-07-10T16:00:00.000Z'),
            subtotal: 80,
            contact: {
              displayName: 'Jane Client',
              firstName: 'Jane',
              lastName: 'Client',
            },
            items: [
              {
                title: 'Facial',
                quantity: 1,
                unitPrice: 0,
                totalPrice: 0,
                metadata: {
                  membershipRedemption: true,
                  clientMembershipId: 'mem-1',
                },
                service: { name: 'Facial', price: 80 },
              },
            ],
          },
        },
      ],
      refundMemberships: [
        {
          id: 'mem-1',
          plan: { name: 'VIP Membership' },
        },
      ],
    });

    const provider = new MembershipServiceUsageProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);

    expect(doc.meta.title).toBe('Membership Credit Usage');
    expect(doc.sections).toHaveLength(3);

    const usage = doc.sections[0]!;
    expect(usage.columns.map((column) => column.key)).toEqual([
      'date',
      'saleNumber',
      'client',
      'membership',
      'service',
      'serviceCredit',
      'value',
    ]);
    const usageRow = usage.rows.find((entry) => !entry.isTotal)!;
    expect(usageRow.cells.saleNumber).toBe('55');
    expect(usageRow.cells.membership).toBe('VIP Membership');
    expect(usageRow.cells.service).toBe('Facial');
    expect(usageRow.cells.serviceCredit).toBe(1);
    expect(usageRow.cells.value).toBe(80);

    const serviceRefunds = doc.sections[1]!;
    expect(serviceRefunds.title).toBe('Service Usage Refunds');
    const refundRow = serviceRefunds.rows.find((entry) => !entry.isTotal)!;
    expect(refundRow.cells.returnedCredits).toBe(1);
    expect(refundRow.cells.refundAmount).toBe(80);

    expect(doc.sections[2]!.title).toBe('Product Usage Refunds');
  });

  it('loads closed invoices for membership redemptions', async () => {
    const prisma = makePrisma({});
    const provider = new MembershipServiceUsageProvider(prisma);
    await provider.generate(businessId, filters, context);

    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              status: {
                in: [InvoiceStatus.PAID, InvoiceStatus.PARTIAL],
              },
            }),
          ]),
        }),
      }),
    );
    expect(InvoiceLineType.SERVICE).toBe('SERVICE');
  });
});
