import { Injectable, Logger } from '@nestjs/common';
import { AsyncJobStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { CleanupAsyncJobsJobPayload } from '../queue.types';

@Injectable()
export class CleanupAsyncJobsProcessor {
  private readonly logger = new Logger(CleanupAsyncJobsProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  async process(payload: CleanupAsyncJobsJobPayload): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - payload.retentionDays);

    const result = await this.prisma.asyncJob.deleteMany({
      where: {
        completedAt: { lt: cutoff },
        status: { in: [AsyncJobStatus.COMPLETED, AsyncJobStatus.FAILED] },
      },
    });

    this.logger.log(
      `Cleanup async jobs: deleted ${result.count} older than ${payload.retentionDays} days`,
    );
  }
}
