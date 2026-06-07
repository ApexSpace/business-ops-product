import { EstimateStatus, InvoiceStatus } from '@prisma/client';
import { FinancialDueStatusService } from './financial-due-status.service';

describe('FinancialDueStatusService', () => {
  const prisma = {
    invoice: { updateMany: jest.fn() },
    estimate: { updateMany: jest.fn() },
  };

  let service: FinancialDueStatusService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FinancialDueStatusService(prisma as never);
  });

  it('marks sent and partial invoices with past due dates as overdue', async () => {
    prisma.invoice.updateMany.mockResolvedValue({ count: 2 });

    const count = await service.markOverdueInvoices();

    expect(count).toBe(2);
    expect(prisma.invoice.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIAL] },
          balanceDue: { gt: 0 },
        }),
        data: { status: InvoiceStatus.OVERDUE },
      }),
    );
  });

  it('marks sent estimates with past expiry dates as expired', async () => {
    prisma.estimate.updateMany.mockResolvedValue({ count: 1 });

    const count = await service.markExpiredEstimates();

    expect(count).toBe(1);
    expect(prisma.estimate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: EstimateStatus.SENT,
        }),
        data: { status: EstimateStatus.EXPIRED },
      }),
    );
  });

  it('syncs invoice and estimate statuses together', async () => {
    prisma.invoice.updateMany.mockResolvedValue({ count: 1 });
    prisma.estimate.updateMany.mockResolvedValue({ count: 1 });

    await service.syncDueStatuses();

    expect(prisma.invoice.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.estimate.updateMany).toHaveBeenCalledTimes(1);
  });
});
