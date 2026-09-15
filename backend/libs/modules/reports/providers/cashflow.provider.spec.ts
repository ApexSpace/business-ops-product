import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { CashflowProvider } from './cashflow.provider';

describe('CashflowProvider', () => {
  const businessId = 'biz-1';
  const context = {
    businessName: 'Acme Spa',
    timezone: 'UTC',
    currency: 'USD',
    generatedAt: new Date('2026-07-20T12:00:00.000Z'),
  };

  const filters = {
    dateRange: 'custom',
    fromDate: '2026-07-01',
    toDate: '2026-07-31',
  };

  function makePrisma(params: {
    payments?: unknown[];
    refunds?: unknown[];
    invoiceCashPayments?: unknown[];
  }) {
    return {
      payment: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce(params.payments ?? [])
          .mockResolvedValueOnce(params.refunds ?? [])
          .mockResolvedValueOnce(params.invoiceCashPayments ?? params.payments ?? []),
      },
    } as never;
  }

  it('builds Mangomint daily columns with net = incoming - tips', async () => {
    const prisma = makePrisma({
      payments: [
        {
          id: 'pay-1',
          amount: 100,
          paidAt: new Date('2026-07-10T15:00:00.000Z'),
          createdAt: new Date('2026-07-10T15:00:00.000Z'),
          invoiceId: 'inv-1',
          invoice: { id: 'inv-1', metadata: { tipAmount: 0 } },
        },
        {
          id: 'pay-2',
          amount: 220,
          paidAt: new Date('2026-07-09T15:00:00.000Z'),
          createdAt: new Date('2026-07-09T15:00:00.000Z'),
          invoiceId: 'inv-2',
          invoice: { id: 'inv-2', metadata: { tipAmount: 220 } },
        },
      ],
      refunds: [],
      invoiceCashPayments: [
        { invoiceId: 'inv-1', amount: 100 },
        { invoiceId: 'inv-2', amount: 220 },
      ],
    });

    const provider = new CashflowProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);

    expect(doc.meta.footnotes).toEqual([
      'Incoming cashflow includes all cash and card payments.',
    ]);
    expect(doc.sections[0]!.columns.map((c) => c.key)).toEqual([
      'date',
      'incoming',
      'staffTips',
      'netCashflow',
    ]);

    const jul9 = doc.sections[0]!.rows.find((r) => r.cells.date === 'Jul 9')!;
    expect(jul9.cells.incoming).toBe(220);
    expect(jul9.cells.staffTips).toBe(220);
    expect(jul9.cells.netCashflow).toBe(0);

    const jul10 = doc.sections[0]!.rows.find((r) => r.cells.date === 'Jul 10')!;
    expect(jul10.cells.incoming).toBe(100);
    expect(jul10.cells.staffTips).toBe(0);
    expect(jul10.cells.netCashflow).toBe(100);

    const total = doc.sections[0]!.rows.find((r) => r.isTotal)!;
    expect(total.cells.incoming).toBe(320);
    expect(total.cells.staffTips).toBe(220);
    expect(total.cells.netCashflow).toBe(100);
  });

  it('subtracts cash-equivalent refunds from incoming', async () => {
    const prisma = makePrisma({
      payments: [
        {
          id: 'pay-1',
          amount: 100,
          paidAt: new Date('2026-07-15T12:00:00.000Z'),
          createdAt: new Date('2026-07-15T12:00:00.000Z'),
          invoiceId: 'inv-1',
          invoice: { id: 'inv-1', metadata: {} },
        },
      ],
      refunds: [
        {
          amount: 40,
          status: PaymentStatus.REFUNDED,
          stripeRefundId: 're_1',
          providerMetadata: { refundAmount: 40 },
          updatedAt: new Date('2026-07-15T18:00:00.000Z'),
        },
      ],
      invoiceCashPayments: [{ invoiceId: 'inv-1', amount: 100 }],
    });

    const provider = new CashflowProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);
    const day = doc.sections[0]!.rows.find((r) => r.cells.date === 'Jul 15')!;

    expect(day.cells.incoming).toBe(60);
    expect(day.cells.netCashflow).toBe(60);
  });

  it('only queries cash-equivalent payment methods', async () => {
    const prisma = makePrisma({ payments: [], refunds: [] });
    const provider = new CashflowProvider(prisma);
    await provider.generate(businessId, filters, context);

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          method: {
            in: [
              PaymentMethod.CASH,
              PaymentMethod.CARD,
              PaymentMethod.BANK_TRANSFER,
              PaymentMethod.STRIPE,
              PaymentMethod.OTHER,
            ],
          },
          status: PaymentStatus.SUCCEEDED,
        }),
      }),
    );
  });

  it('allocates tips across cash payments on the same sale', async () => {
    const prisma = makePrisma({
      payments: [
        {
          id: 'pay-a',
          amount: 60,
          paidAt: new Date('2026-07-20T12:00:00.000Z'),
          createdAt: new Date('2026-07-20T12:00:00.000Z'),
          invoiceId: 'inv-1',
          invoice: { id: 'inv-1', metadata: { tipAmount: 10 } },
        },
        {
          id: 'pay-b',
          amount: 40,
          paidAt: new Date('2026-07-20T13:00:00.000Z'),
          createdAt: new Date('2026-07-20T13:00:00.000Z'),
          invoiceId: 'inv-1',
          invoice: { id: 'inv-1', metadata: { tipAmount: 10 } },
        },
      ],
      refunds: [],
      invoiceCashPayments: [
        { invoiceId: 'inv-1', amount: 60 },
        { invoiceId: 'inv-1', amount: 40 },
      ],
    });

    const provider = new CashflowProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);
    const day = doc.sections[0]!.rows.find((r) => r.cells.date === 'Jul 20')!;

    expect(day.cells.incoming).toBe(100);
    expect(day.cells.staffTips).toBe(10);
    expect(day.cells.netCashflow).toBe(90);
  });
});
