import { CustomValueResolverService } from './custom-value-resolver.service';

describe('CustomValueResolverService', () => {
  const prisma = {
    business: { findFirst: jest.fn() },
    contact: { findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
    appointment: { findFirst: jest.fn() },
    lead: { findFirst: jest.fn() },
    invoice: { findFirst: jest.fn() },
    estimate: { findFirst: jest.fn() },
    payment: { findFirst: jest.fn() },
    task: { findFirst: jest.fn() },
    workItem: { findFirst: jest.fn() },
    conversation: { findFirst: jest.fn() },
    calendar: { findFirst: jest.fn() },
    service: { findFirst: jest.fn() },
    form: { findFirst: jest.fn() },
  };

  const service = new CustomValueResolverService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves implemented contact and business custom values', async () => {
    prisma.business.findFirst.mockResolvedValue({
      name: 'Sunrise MedSpa',
      email: 'hello@sunrise.com',
      phone: '+1 555 0100',
      timezone: 'America/New_York',
      currency: 'USD',
      address: '123 Main St',
    });
    prisma.contact.findFirst.mockResolvedValue({
      firstName: 'Jane',
      lastName: 'Doe',
      companyName: 'Acme',
      email: 'jane@example.com',
      phoneCountryCode: '+1',
      phoneNumber: '5550100',
      source: 'Website',
      tags: [{ tag: { name: 'VIP' } }],
    });

    const result = await service.resolve(
      {
        businessId: '11111111-1111-4111-8111-111111111111',
        contactId: '22222222-2222-4222-8222-222222222222',
      },
      ['contact.first_name', 'contact.full_name', 'business.name'],
    );

    expect(result).toEqual({
      'contact.first_name': 'Jane',
      'contact.full_name': 'Jane Doe',
      'business.name': 'Sunrise MedSpa',
    });
  });
});
