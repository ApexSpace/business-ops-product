import { InvoiceLineType, PackageHistoryEventType } from '@prisma/client';
import { PackageUsageProvider } from './package-usage.provider';

describe('PackageUsageProvider', () => {
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
    redeemEvents?: unknown[];
    services?: unknown[];
    invoices?: unknown[];
    packagesFromInvoices?: unknown[];
    adjustments?: unknown[];
    adjustmentServices?: unknown[];
    refundPayments?: unknown[];
    refundPackages?: unknown[];
  }) {
    return {
      packageHistoryEvent: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce(params.redeemEvents ?? [])
          .mockResolvedValueOnce(params.adjustments ?? []),
      },
      service: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce(params.services ?? [])
          .mockResolvedValueOnce(params.adjustmentServices ?? []),
      },
      invoice: {
        findMany: jest.fn().mockResolvedValue(params.invoices ?? []),
      },
      clientPackage: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce(params.packagesFromInvoices ?? [])
          .mockResolvedValueOnce(params.refundPackages ?? []),
      },
      payment: {
        findMany: jest.fn().mockResolvedValue(params.refundPayments ?? []),
      },
    } as never;
  }

  it('builds Mangomint usage and refund sections', async () => {
    const prisma = makePrisma({
      redeemEvents: [
        {
          id: 'evt-1',
          serviceId: 'svc-1',
          quantityChange: -1,
          createdAt: new Date('2026-07-10T16:00:00.000Z'),
          clientPackage: {
            id: 'pkg-1',
            purchaseDate: new Date('2026-06-01T16:00:00.000Z'),
            createdAt: new Date('2026-06-01T16:00:00.000Z'),
            contact: {
              displayName: 'Jane Client',
              firstName: 'Jane',
              lastName: 'Client',
            },
            packageTemplate: { name: 'Glow Package', totalPrice: 200 },
            serviceAllocations: [{ initialQty: 4 }],
            invoice: null,
          },
        },
      ],
      services: [{ id: 'svc-1', name: 'Facial', price: 50 }],
      adjustments: [
        {
          id: 'adj-1',
          serviceId: 'svc-1',
          quantityChange: 1,
          createdAt: new Date('2026-07-12T16:00:00.000Z'),
          clientPackage: {
            id: 'pkg-1',
            purchaseDate: new Date('2026-07-05T16:00:00.000Z'),
            createdAt: new Date('2026-07-05T16:00:00.000Z'),
            contact: {
              displayName: 'Jane Client',
              firstName: 'Jane',
              lastName: 'Client',
            },
            packageTemplate: { name: 'Glow Package', totalPrice: 200 },
            serviceAllocations: [{ initialQty: 4 }],
            invoice: {
              displaySequence: 11,
              closedAt: new Date('2026-07-05T16:00:00.000Z'),
              issueDate: new Date('2026-07-05T16:00:00.000Z'),
            },
          },
        },
      ],
      adjustmentServices: [{ id: 'svc-1', name: 'Facial', price: 50 }],
    });

    const provider = new PackageUsageProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);

    expect(doc.meta.description).toBe('Shows the details of package usages.');
    expect(doc.sections).toHaveLength(3);

    const usage = doc.sections[0]!;
    expect(usage.columns.map((column) => column.key)).toEqual([
      'date',
      'saleNumber',
      'client',
      'packageName',
      'createdDate',
      'service',
      'value',
    ]);
    const usageRow = usage.rows.find((entry) => !entry.isTotal)!;
    expect(usageRow.cells.client).toBe('Jane Client');
    expect(usageRow.cells.packageName).toBe('Glow Package');
    expect(usageRow.cells.service).toBe('Facial');
    expect(usageRow.cells.value).toBe(50);

    const serviceRefunds = doc.sections[1]!;
    expect(serviceRefunds.title).toBe('Service Usage Refunds');
    expect(serviceRefunds.columns.map((column) => column.key)).toEqual([
      'refundDate',
      'refundNumber',
      'saleDate',
      'saleNumber',
      'client',
      'packageName',
      'createdDate',
      'service',
      'returnedCredits',
      'refundAmount',
    ]);
    const refundRow = serviceRefunds.rows.find((entry) => !entry.isTotal)!;
    expect(refundRow.cells.saleNumber).toBe('11');
    expect(refundRow.cells.returnedCredits).toBe(1);
    expect(refundRow.cells.refundAmount).toBe(50);

    const productRefunds = doc.sections[2]!;
    expect(productRefunds.title).toBe('Product Usage Refunds');
    expect(productRefunds.rows.find((entry) => entry.isTotal)!.cells.value).toBe(
      0,
    );
  });

  it('includes checkout-applied package usage with sale number', async () => {
    const prisma = makePrisma({
      invoices: [
        {
          id: 'inv-1',
          displaySequence: 22,
          closedAt: new Date('2026-07-08T16:00:00.000Z'),
          issueDate: new Date('2026-07-08T16:00:00.000Z'),
          contact: {
            displayName: 'Alex Buyer',
            firstName: 'Alex',
            lastName: 'Buyer',
          },
          items: [
            {
              id: 'item-1',
              title: 'Massage',
              quantity: 1,
              unitPrice: 80,
              totalPrice: 0,
              metadata: { clientPackageId: 'pkg-2' },
              service: { id: 'svc-2', name: 'Massage', price: 80 },
            },
          ],
        },
      ],
      packagesFromInvoices: [
        {
          id: 'pkg-2',
          purchaseDate: new Date('2026-05-01T16:00:00.000Z'),
          createdAt: new Date('2026-05-01T16:00:00.000Z'),
          packageTemplate: { name: 'Relax Package', totalPrice: 320 },
          serviceAllocations: [{ initialQty: 4 }],
        },
      ],
    });

    const provider = new PackageUsageProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);
    const usageRow = doc.sections[0]!.rows.find((entry) => !entry.isTotal)!;

    expect(usageRow.cells.saleNumber).toBe('22');
    expect(usageRow.cells.packageName).toBe('Relax Package');
    expect(usageRow.cells.value).toBe(80);
    expect(InvoiceLineType.SERVICE).toBe('SERVICE');
    expect(PackageHistoryEventType.REDEEMED).toBe('REDEEMED');
  });
});
