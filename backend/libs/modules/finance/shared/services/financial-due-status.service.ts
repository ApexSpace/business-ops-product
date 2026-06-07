import { Injectable, Logger } from '@nestjs/common';
import { EstimateStatus, InvoiceStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { startOfTodayUtc } from '../utils/financial-due-date.util';

@Injectable()
export class FinancialDueStatusService {
  private readonly logger = new Logger(FinancialDueStatusService.name);

  constructor(private readonly prisma: PrismaService) {}

  async markOverdueInvoices(): Promise<number> {
    const startOfToday = startOfTodayUtc();
    const result = await this.prisma.invoice.updateMany({
      where: {
        deletedAt: null,
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIAL] },
        balanceDue: { gt: 0 },
        dueDate: { lt: startOfToday },
      },
      data: { status: InvoiceStatus.OVERDUE },
    });

    if (result.count > 0) {
      this.logger.log(`Marked ${result.count} invoice(s) as overdue`);
    }

    return result.count;
  }

  async markExpiredEstimates(): Promise<number> {
    const startOfToday = startOfTodayUtc();
    const result = await this.prisma.estimate.updateMany({
      where: {
        deletedAt: null,
        status: EstimateStatus.SENT,
        expiryDate: { lt: startOfToday },
      },
      data: { status: EstimateStatus.EXPIRED },
    });

    if (result.count > 0) {
      this.logger.log(`Marked ${result.count} estimate(s) as expired`);
    }

    return result.count;
  }

  async syncDueStatuses(): Promise<void> {
    await Promise.all([
      this.markOverdueInvoices(),
      this.markExpiredEstimates(),
    ]);
  }
}
