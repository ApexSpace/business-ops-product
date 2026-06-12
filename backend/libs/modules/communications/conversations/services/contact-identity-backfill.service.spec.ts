import { ContactIdentityBackfillService } from './contact-identity-backfill.service';

describe('ContactIdentityBackfillService', () => {
  it('reports dry-run merges without writing', async () => {
    const prisma = {
      business: {
        findMany: jest.fn().mockResolvedValue([{ id: 'biz-1' }]),
      },
      contact: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'c1',
            businessId: 'biz-1',
            email: 'user@example.com',
            phoneNumber: null,
            phoneCountryCode: null,
            displayName: 'One',
            firstName: 'One',
            lastName: null,
            companyName: null,
            avatarUrl: null,
            metadata: { whatsappWaId: '111' },
            createdAt: new Date('2026-01-02T00:00:00.000Z'),
            updatedAt: new Date(),
            deletedAt: null,
            timezone: null,
            address: null,
            city: null,
            state: null,
            country: null,
            zip: null,
            source: null,
            createdById: null,
          },
          {
            id: 'c2',
            businessId: 'biz-1',
            email: 'user@example.com',
            phoneNumber: '923001234567',
            phoneCountryCode: '+',
            displayName: null,
            firstName: 'Two',
            lastName: null,
            companyName: null,
            avatarUrl: null,
            metadata: { facebookPsid: 'psid-1' },
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date(),
            deletedAt: null,
            timezone: null,
            address: null,
            city: null,
            state: null,
            country: null,
            zip: null,
            source: null,
            createdById: null,
          },
        ]),
      },
      conversation: {
        count: jest.fn().mockResolvedValue(2),
      },
      lead: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn(),
    };

    const service = new ContactIdentityBackfillService(prisma as never);
    const result = await service.run({
      businessId: 'biz-1',
      dryRun: true,
      includePhone: false,
    });

    expect(result.dryRun).toBe(true);
    expect(result.businesses[0]?.emailGroupsProcessed).toBe(1);
    expect(result.businesses[0]?.contactsMerged).toBe(1);
    expect(result.businesses[0]?.conversationsReassigned).toBe(2);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
