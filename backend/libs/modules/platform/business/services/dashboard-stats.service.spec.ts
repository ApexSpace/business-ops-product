import {
  AppointmentStatus,
  ConversationStatus,
  LeadStatus,
  PaymentStatus,
  WorkItemStatus,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { DashboardStatsService } from './dashboard-stats.service';

describe('DashboardStatsService', () => {
  const businessId = 'biz-1';

  function buildMocks() {
    const prisma = {
      business: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ timezone: 'America/New_York' }),
      },
      contact: { count: jest.fn().mockResolvedValue(10) },
      lead: {
        groupBy: jest.fn().mockResolvedValue([
          { status: LeadStatus.ACTIVE, _count: { _all: 3 } },
          { status: LeadStatus.WON, _count: { _all: 1 } },
        ]),
      },
      pipeline: { count: jest.fn().mockResolvedValue(2) },
      businessMembership: { count: jest.fn().mockResolvedValue(4) },
      workItem: {
        count: jest
          .fn()
          .mockResolvedValueOnce(8)
          .mockResolvedValueOnce(2)
          .mockResolvedValueOnce(3)
          .mockResolvedValueOnce(2),
      },
      appointment: {
        count: jest
          .fn()
          .mockResolvedValueOnce(20)
          .mockResolvedValueOnce(5)
          .mockResolvedValueOnce(7)
          .mockResolvedValueOnce(1),
      },
      conversation: {
        count: jest.fn().mockResolvedValueOnce(6).mockResolvedValueOnce(2),
      },
      payment: {
        aggregate: jest
          .fn()
          .mockResolvedValueOnce({
            _count: { _all: 3 },
            _sum: { amount: new Prisma.Decimal('150.50') },
          })
          .mockResolvedValueOnce({
            _count: { _all: 2 },
            _sum: { amount: new Prisma.Decimal('100.00') },
          }),
      },
      invoice: {
        aggregate: jest.fn().mockResolvedValue({
          _count: { _all: 2 },
          _sum: { balanceDue: new Prisma.Decimal('450.00') },
        }),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ count: BigInt(3) }]),
    };

    const service = new DashboardStatsService(prisma as never);
    return { service, prisma };
  }

  it('returns extended dashboard stats including revenue and attention metrics', async () => {
    const { service, prisma } = buildMocks();

    const result = await service.getStats(businessId);

    expect(prisma.conversation.count).toHaveBeenCalledWith({
      where: {
        businessId,
        deletedAt: null,
        status: ConversationStatus.OPEN,
      },
    });
    expect(prisma.payment.aggregate).toHaveBeenCalledTimes(2);
    expect(result.conversations).toBe(6);
    expect(result.revenueToday).toEqual({
      amount: '150.50',
      paymentCount: 3,
    });
    expect(result.revenueYesterday).toEqual({
      amount: '100.00',
      paymentCount: 2,
    });
    expect(result.attention).toEqual({
      overdueInvoices: 2,
      overdueInvoiceBalance: '450.00',
      lowStockProducts: 3,
      unreadConversations: 2,
    });
    expect(result.workItems.pending).toBe(2);
    expect(result.appointmentStats.today).toBe(5);
  });
});
