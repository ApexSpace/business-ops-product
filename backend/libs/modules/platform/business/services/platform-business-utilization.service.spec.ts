import { IntegrationStatus, MembershipStatus } from '@prisma/client';
import { PlatformBusinessUtilizationService } from './platform-business-utilization.service';
import { DashboardStatsService } from './dashboard-stats.service';

describe('PlatformBusinessUtilizationService', () => {
  const businessId = 'biz-1';

  const dashboardStats = {
    contacts: 142,
    leads: {
      total: 28,
      active: 20,
      won: 5,
      lost: 2,
      archived: 1,
    },
    pipelines: 2,
    appointments: 45,
    appointmentStats: {
      today: 4,
      upcoming: 12,
      cancelledOrNoShow: 3,
    },
    conversations: 0,
    members: 3,
    workItems: {
      total: 12,
      scheduled: 2,
      completed: 5,
      pending: 5,
    },
  };

  function buildMocks() {
    const prisma = {
      business: {
        findFirst: jest.fn().mockResolvedValue({
          id: businessId,
          snapshotId: 'snap-1',
          snapshotAppliedAt: new Date('2026-06-01T12:00:00Z'),
          industry: { name: 'Dental' },
          snapshot: {
            id: 'snap-1',
            name: 'Dental Blueprint',
          },
        }),
      },
      service: { count: jest.fn().mockResolvedValue(5) },
      tag: { count: jest.fn().mockResolvedValue(8) },
      calendar: { count: jest.fn().mockResolvedValue(2) },
      estimate: { count: jest.fn().mockResolvedValue(10) },
      invoice: { count: jest.fn().mockResolvedValue(6) },
      payment: { count: jest.fn().mockResolvedValue(3) },
      conversation: { count: jest.fn().mockResolvedValue(7) },
      chatbot: { count: jest.fn().mockResolvedValue(1) },
      chatbotRule: { count: jest.fn().mockResolvedValue(4) },
      emailTemplate: { count: jest.fn().mockResolvedValue(2) },
      businessEmailPreference: { count: jest.fn().mockResolvedValue(3) },
      businessIntegration: {
        findMany: jest.fn().mockResolvedValue([
          {
            providerKey: 'google_calendar',
            provider: { name: 'Google Calendar' },
          },
          { providerKey: 'stripe', provider: { name: 'Stripe' } },
        ]),
      },
      businessMembership: {
        count: jest.fn().mockResolvedValue(1),
      },
      snapshotProvision: {
        groupBy: jest.fn().mockResolvedValue([
          { assetType: 'pipeline', _count: { _all: 1 } },
          { assetType: 'service', _count: { _all: 2 } },
        ]),
      },
      auditLog: {
        findFirst: jest.fn().mockResolvedValue({
          createdAt: new Date('2026-06-07T10:00:00Z'),
        }),
      },
    };

    const dashboardStatsService = {
      getStats: jest.fn().mockResolvedValue(dashboardStats),
    } as unknown as DashboardStatsService;

    const service = new PlatformBusinessUtilizationService(
      prisma as never,
      dashboardStatsService,
    );

    return { service, prisma, dashboardStatsService };
  }

  it('returns utilization metrics for an existing business', async () => {
    const { service, prisma, dashboardStatsService } = buildMocks();

    const result = await service.getUtilization(businessId);

    expect(dashboardStatsService.getStats).toHaveBeenCalledWith(businessId);
    expect(prisma.business.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: businessId, deletedAt: null } }),
    );
    expect(result.crm.contacts).toBe(142);
    expect(result.crm.leads.total).toBe(28);
    expect(result.crm.services).toBe(5);
    expect(result.crm.tags).toBe(8);
    expect(result.operations.calendars).toBe(2);
    expect(result.operations.appointmentStats.today).toBe(4);
    expect(result.finance.invoices).toBe(6);
    expect(result.communications.chatbots).toBe(1);
    expect(result.communications.chatbotRules).toBe(4);
    expect(result.communications.emailTemplatesCustomized).toBe(2);
    expect(result.finance.invoicesPaid).toBe(6);
    expect(result.integrations.connected).toBe(2);
    expect(result.integrations.providers).toEqual([
      { key: 'google_calendar', name: 'Google Calendar' },
      { key: 'stripe', name: 'Stripe' },
    ]);
    expect(result.team.activeMembers).toBe(3);
    expect(result.team.invitedMembers).toBe(1);
    expect(result.blueprint.snapshotName).toBe('Dental Blueprint');
    expect(result.blueprint.industryName).toBe('Dental');
    expect(result.blueprint.provisionsByType).toEqual({
      pipeline: 1,
      service: 2,
    });
    expect(result.activity.lastAuditAt).toBe('2026-06-07T10:00:00.000Z');
  });

  it('throws when business is not found', async () => {
    const { service, prisma } = buildMocks();
    prisma.business.findFirst.mockResolvedValue(null);

    await expect(service.getUtilization(businessId)).rejects.toMatchObject({
      response: expect.objectContaining({ message: 'Business not found' }),
    });
  });

  it('queries invited membership and integration counts with expected filters', async () => {
    const { service, prisma } = buildMocks();

    await service.getUtilization(businessId);

    expect(prisma.businessMembership.count).toHaveBeenCalledWith({
      where: {
        businessId,
        deletedAt: null,
        status: MembershipStatus.INVITED,
      },
    });
    expect(prisma.businessIntegration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessId,
          status: IntegrationStatus.CONNECTED,
        },
        select: {
          providerKey: true,
          provider: { select: { name: true } },
        },
      }),
    );
    expect(prisma.snapshotProvision.groupBy).toHaveBeenCalledWith({
      by: ['assetType'],
      where: { businessId },
      _count: { _all: true },
    });
  });
});
