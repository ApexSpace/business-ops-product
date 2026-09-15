import { InvoiceLineType, PaymentStatus } from '@prisma/client';
import { ServiceSalesProvider } from './service-sales.provider';

describe('ServiceSalesProvider', () => {
  const businessId = 'biz-1';
  const context = {
    businessName: 'Demo Spa',
    timezone: 'America/New_York',
    currency: 'USD',
    generatedAt: new Date('2026-07-18T23:00:00.000Z'),
  };

  const monthFilters = {
    dateRange: 'custom',
    fromDate: '2026-07-01',
    toDate: '2026-07-31',
  };

  function makePrisma(opts: {
    invoices?: unknown[];
    payments?: unknown[];
  }) {
    return {
      invoice: {
        findMany: jest.fn().mockResolvedValue(opts.invoices ?? []),
      },
      payment: {
        findMany: jest.fn().mockResolvedValue(opts.payments ?? []),
      },
    } as never;
  }

  it('builds category hierarchy, footnotes, and refunds section', async () => {
    const prisma = makePrisma({
      invoices: [
        {
          id: 'inv-1',
          closedAt: new Date('2026-07-09T15:00:00.000Z'),
          issueDate: new Date('2026-07-09T15:00:00.000Z'),
          items: [
            {
              lineType: InvoiceLineType.SERVICE,
              title: 'Signature Facial',
              quantity: 2,
              unitPrice: 100,
              totalPrice: 200,
              metadata: {},
              serviceId: 'svc-1',
              service: {
                name: 'Signature Facial',
                price: 100,
                category: { name: 'Facials' },
              },
            },
          ],
        },
      ],
      payments: [],
    });

    const provider = new ServiceSalesProvider(prisma);
    const doc = await provider.generate(
      businessId,
      monthFilters,
      context,
    );

    expect(doc.meta.reportKey).toBe('service_sales');
    expect(doc.meta.footnotes).toHaveLength(2);
    expect(doc.sections.map((s) => s.id)).toEqual(['services', 'refunds']);

    const services = doc.sections[0]!;
    expect(services.rows.some((r) => r.isGroup && r.cells.label === 'Facials')).toBe(
      true,
    );
    expect(
      services.rows.some(
        (r) => r.depth === 1 && r.cells.label === 'Signature Facial',
      ),
    ).toBe(true);
    const total = services.rows.find((r) => r.isTotal);
    expect(total?.cells.qty).toBe(2);
    expect(total?.cells.sales).toBe(200);

    expect(doc.sections[1]!.title).toBe('Refunds');
    expect(doc.sections[1]!.pageBreakBefore).toBe(true);
  });

  it('adds daily and customization sections when filters are enabled', async () => {
    const prisma = makePrisma({
      invoices: [
        {
          id: 'inv-1',
          closedAt: new Date('2026-07-09T15:00:00.000Z'),
          issueDate: new Date('2026-07-09T15:00:00.000Z'),
          items: [
            {
              lineType: InvoiceLineType.SERVICE,
              title: 'Hydra Facial',
              quantity: 1,
              unitPrice: 110,
              totalPrice: 110,
              metadata: {
                customizations: [
                  { name: 'Extra Mask', amount: 15, count: 1 },
                ],
              },
              serviceId: 'svc-2',
              service: {
                name: 'Hydra Facial',
                price: 110,
                category: { name: 'Facials' },
              },
            },
          ],
        },
        {
          id: 'inv-2',
          closedAt: new Date('2026-07-10T15:00:00.000Z'),
          issueDate: new Date('2026-07-10T15:00:00.000Z'),
          items: [
            {
              lineType: InvoiceLineType.SERVICE,
              title: 'Express Facial',
              quantity: 1,
              unitPrice: 80,
              totalPrice: 80,
              metadata: {},
              serviceId: 'svc-3',
              service: {
                name: 'Express Facial',
                price: 80,
                category: { name: 'Facials' },
              },
            },
          ],
        },
      ],
      payments: [],
    });

    const provider = new ServiceSalesProvider(prisma);
    const doc = await provider.generate(
      businessId,
      {
        ...monthFilters,
        includeDailyDetails: true,
        includeCustomizationDetails: true,
      },
      context,
    );

    const ids = doc.sections.map((s) => s.id);
    expect(ids[0]).toBe('services');
    expect(ids[1]).toBe('customizations');
    expect(ids[2]).toBe('refunds');
    expect(ids.filter((id) => id.startsWith('day-'))).toHaveLength(2);

    // Customizations share a page with refunds; first day starts a new page.
    expect(doc.sections[1]!.pageBreakBefore).toBe(true);
    expect(doc.sections[2]!.pageBreakBefore).toBe(false);
    expect(doc.sections[3]!.pageBreakBefore).toBe(true);
    expect(doc.sections[4]!.pageBreakBefore).toBe(false);

    const custom = doc.sections[1]!;
    expect(custom.rows.some((r) => String(r.cells.label).includes('Extra Mask'))).toBe(
      true,
    );
    const customTotal = custom.rows.find((r) => r.isTotal);
    expect(customTotal?.cells.count).toBe(1);
    expect(customTotal?.cells.amount).toBe(15);
  });

  it('attributes refunds filtered by sale date across service lines', async () => {
    const prisma = makePrisma({
      invoices: [],
      payments: [
        {
          amount: 100,
          status: PaymentStatus.REFUNDED,
          updatedAt: new Date('2026-08-01T12:00:00.000Z'),
          invoice: {
            closedAt: new Date('2026-07-15T12:00:00.000Z'),
            issueDate: new Date('2026-07-15T12:00:00.000Z'),
            items: [
              {
                lineType: InvoiceLineType.SERVICE,
                title: 'Signature Facial',
                totalPrice: 80,
                serviceId: 'svc-1',
                service: {
                  name: 'Signature Facial',
                  category: { name: 'Facials' },
                },
              },
              {
                lineType: InvoiceLineType.SERVICE,
                title: 'Express Facial',
                totalPrice: 20,
                serviceId: 'svc-3',
                service: {
                  name: 'Express Facial',
                  category: { name: 'Facials' },
                },
              },
            ],
          },
        },
      ],
    });

    const provider = new ServiceSalesProvider(prisma);
    const doc = await provider.generate(
      businessId,
      {
        ...monthFilters,
        filterRefundsBy: 'sale_date',
      },
      context,
    );

    const refunds = doc.sections.find((s) => s.id === 'refunds')!;
    const total = refunds.rows.find((r) => r.isTotal)!;
    expect(total.cells.refundCount).toBe(1);
    expect(total.cells.refundAmount).toBe(100);
  });
});
