import { Injectable, Logger } from '@nestjs/common';
import { WebhookEventStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { CleanupWebhookEventsJobPayload } from '../queue.types';

@Injectable()
export class CleanupWebhookEventsProcessor {
  private readonly logger = new Logger(CleanupWebhookEventsProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  async process(payload: CleanupWebhookEventsJobPayload): Promise<void> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - payload.retentionDays);

    const result = await this.prisma.webhookEvent.deleteMany({
      where: {
        receivedAt: { lt: cutoff },
        status: {
          in: [
            WebhookEventStatus.PROCESSED,
            WebhookEventStatus.IGNORED,
            WebhookEventStatus.FAILED,
          ],
        },
      },
    });

    this.logger.log(
      `Cleanup webhook events: deleted ${result.count} older than ${payload.retentionDays} days`,
    );
  }
}
