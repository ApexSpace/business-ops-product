import { ClientPackageSource, InvoiceStatus } from '@prisma/client';
import { PackageSalesDetailsProvider } from './package-sales-details.provider';

describe('PackageSalesDetailsProvider', () => {
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

  function makePrisma(packages: unknown[]) {
    return {
      clientPackage: {
        findMany: jest.fn().mockResolvedValue(packages),
      },
    } as never;
  }

  it('builds Mangomint-style detail columns', async () => {
    const prisma = makePrisma([
      {
        id: 'pkg-1',
        packageTemplateId: 'tpl-1',
        contactId: 'contact-1',
        purchaseDate: new Date('2026-07-10T16:00:00.000Z'),
        contact: {
          displayName: 'Jane Client',
          firstName: 'Jane',
          lastName: 'Client',
        },
        packageTemplate: {
          name: 'Glow Package',
          totalPrice: 200,
        },
        invoice: {
          displaySequence: 42,
          closedAt: new Date('2026-07-10T16:00:00.000Z'),
          issueDate: new Date('2026-07-10T16:00:00.000Z'),
          contact: {
            displayName: 'Jane Client',
            firstName: 'Jane',
            lastName: 'Client',
          },
          closedBy: { firstName: 'Alex', lastName: 'Smith' },
          createdBy: { firstName: 'Alex', lastName: 'Smith' },
          items: [
            {
              id: 'item-1',
              totalPrice: 180,
              unitPrice: 200,
              metadata: {
                packageTemplateId: 'tpl-1',
                ownerContactId: 'contact-1',
              },
              staffUser: { firstName: 'Sam', lastName: 'Lee' },
            },
          ],
        },
      },
    ]);

    const provider = new PackageSalesDetailsProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);

    const section = doc.sections[0]!;
    expect(section.columns.map((column) => column.key)).toEqual([
      'saleNumber',
      'saleDate',
      'client',
      'packageName',
      'price',
      'soldByStaff',
    ]);

    const dataRow = section.rows[0]!;
    expect(dataRow.cells.saleNumber).toBe('42');
    expect(dataRow.cells.client).toBe('Jane Client');
    expect(dataRow.cells.packageName).toBe('Glow Package');
    expect(dataRow.cells.price).toBe(180);
    expect(dataRow.cells.soldByStaff).toBe('Sam Lee');
    expect(doc.meta.description).toBe(
      'Shows details for each sale of a package.',
    );
  });

  it('loads sold packages in the selected period', async () => {
    const prisma = makePrisma([]);
    const provider = new PackageSalesDetailsProvider(prisma);
    await provider.generate(businessId, filters, context);

    expect(prisma.clientPackage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              invoice: expect.objectContaining({
                OR: expect.arrayContaining([
                  expect.objectContaining({
                    status: {
                      in: [InvoiceStatus.PAID, InvoiceStatus.PARTIAL],
                    },
                  }),
                ]),
              }),
            }),
            expect.objectContaining({
              invoiceId: null,
              source: {
                in: [ClientPackageSource.ONLINE, ClientPackageSource.STAFF],
              },
            }),
          ]),
        }),
      }),
    );
  });
});
