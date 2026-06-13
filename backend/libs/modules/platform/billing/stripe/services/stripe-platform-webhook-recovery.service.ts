import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  Prisma,
  WebhookEventProvider,
  WebhookEventStatus,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { JobEnqueueService } from '@app/core/jobs/job-enqueue.service';
import { WebhookEventsRepository } from '@app/modules/communications/conversations/repositories/webhook-events.repository';

/** Re-processes Stripe platform webhooks left in RECEIVED/FAILED when enqueue failed. */
@Injectable()
export class StripePlatformWebhookRecoveryService implements OnModuleInit {
  private readonly logger = new Logger(StripePlatformWebhookRecoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookEventsRepository: WebhookEventsRepository,
    private readonly jobEnqueue: JobEnqueueService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (
      (process.env.STRIPE_WEBHOOK_RECOVERY_ON_STARTUP ?? 'true').toLowerCase() ===
      'false'
    ) {
      return;
    }

    const stuck = await this.prisma.webhookEvent.findMany({
      where: {
        provider: WebhookEventProvider.STRIPE,
        status: {
          in: [WebhookEventStatus.RECEIVED, WebhookEventStatus.FAILED],
        },
      },
      orderBy: { receivedAt: 'asc' },
      take: 50,
      select: { id: true },
    });

    if (stuck.length === 0) return;

    this.logger.log(`Recovering ${stuck.length} stuck Stripe webhook(s)`);

    for (const event of stuck) {
      try {
        await this.jobEnqueue.enqueueStripeWebhook({
          webhookEventId: event.id,
          source: 'platform',
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Recovery failed';
        this.logger.warn(`Stripe webhook recovery failed for ${event.id}: ${message}`);
      }
    }
  }
}
