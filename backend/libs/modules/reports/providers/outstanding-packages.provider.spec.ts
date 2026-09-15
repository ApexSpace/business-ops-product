import {
  ClientPackageStatus,
  PackageHistoryEventType,
} from '@prisma/client';
import { OutstandingPackagesProvider } from './outstanding-packages.provider';

describe('OutstandingPackagesProvider', () => {
  const businessId = 'biz-1';
  const context = {
    businessName: 'Acme Spa',
    timezone: 'America/New_York',
    currency: 'USD',
    generatedAt: new Date('2026-07-20T12:00:00.000Z'),
  };

  function makePrisma(packages: unknown[]) {
    return {
      clientPackage: {
        findMany: jest.fn().mockResolvedValue(packages),
      },
    } as never;
  }

  it('computes remaining credits and amount as of the selected day', async () => {
    const prisma = makePrisma([
      {
        id: 'pkg-1',
        purchaseDate: new Date('2026-06-01T16:00:00.000Z'),
        createdAt: new Date('2026-06-01T16:00:00.000Z'),
        expirationDate: null,
        status: ClientPackageStatus.ACTIVE,
        contact: {
          displayName: 'Jane Client',
          firstName: 'Jane',
          lastName: 'Client',
          email: 'jane@example.com',
          phoneCountryCode: '+1',
          phoneNumber: '5550100',
        },
        packageTemplate: {
          name: 'Glow Package',
          totalPrice: 200,
        },
        serviceAllocations: [
          { serviceId: 'svc-1', initialQty: 4 },
        ],
        history: [
          {
            eventType: PackageHistoryEventType.REDEEMED,
            quantityChange: -1,
            serviceId: 'svc-1',
          },
          {
            eventType: PackageHistoryEventType.REDEEMED,
            quantityChange: -1,
            serviceId: 'svc-1',
          },
        ],
      },
    ]);

    const provider = new OutstandingPackagesProvider(prisma);
    const doc = await provider.generate(
      businessId,
      { asOfDate: '2026-07-20' },
      context,
    );

    expect(doc.meta.periodLabel).toContain('July 20, 2026');
    expect(doc.meta.description).toBe(
      'Shows the list of outstanding package credits.',
    );

    const section = doc.sections[0]!;
    expect(section.columns.map((column) => column.key)).toEqual([
      'packageName',
      'purchaseDate',
      'client',
      'email',
      'phone',
      'remainingServices',
      'remainingProducts',
      'amount',
    ]);

    const dataRow = section.rows.find((entry) => !entry.isTotal)!;
    expect(dataRow.cells.packageName).toBe('Glow Package');
    expect(dataRow.cells.client).toBe('Jane Client');
    expect(dataRow.cells.email).toBe('jane@example.com');
    expect(dataRow.cells.phone).toBe('+1 5550100');
    expect(dataRow.cells.remainingServices).toBe(2);
    expect(dataRow.cells.remainingProducts).toBe(0);
    expect(dataRow.cells.amount).toBe(100);

    const total = section.rows.find((entry) => entry.isTotal)!;
    expect(total.cells.amount).toBe(100);

    expect(prisma.clientPackage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          businessId,
          purchaseDate: expect.objectContaining({ lte: expect.any(Date) }),
        }),
      }),
    );
  });

  it('excludes packages with no remaining credits as of the selected day', async () => {
    const prisma = makePrisma([
      {
        id: 'pkg-empty',
        purchaseDate: new Date('2026-06-01T16:00:00.000Z'),
        createdAt: new Date('2026-06-01T16:00:00.000Z'),
        expirationDate: null,
        status: ClientPackageStatus.DEPLETED,
        contact: {
          displayName: 'Empty Client',
          firstName: 'Empty',
          lastName: 'Client',
          email: null,
          phoneCountryCode: null,
          phoneNumber: null,
        },
        packageTemplate: { name: 'Used Up', totalPrice: 100 },
        serviceAllocations: [{ serviceId: 'svc-1', initialQty: 1 }],
        history: [
          {
            eventType: PackageHistoryEventType.REDEEMED,
            quantityChange: -1,
            serviceId: 'svc-1',
          },
        ],
      },
    ]);

    const provider = new OutstandingPackagesProvider(prisma);
    const doc = await provider.generate(
      businessId,
      { asOfDate: '2026-07-20' },
      context,
    );

    expect(doc.sections[0]!.rows.filter((entry) => !entry.isTotal)).toHaveLength(
      0,
    );
    expect(doc.sections[0]!.rows.find((entry) => entry.isTotal)!.cells.amount).toBe(
      0,
    );
  });
});
