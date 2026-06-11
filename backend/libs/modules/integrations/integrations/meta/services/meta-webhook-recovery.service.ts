import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  Prisma,
  WebhookEventProvider,
  WebhookEventStatus,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { normalizeMetaWebhookPayload } from '@app/modules/communications/conversations/adapters/meta/meta-inbound-normalizer';
import { WebhookEventsRepository } from '@app/modules/communications/conversations/repositories/webhook-events.repository';
import { MetaWebhookDispatchService } from './meta-webhook-dispatch.service';

/** Re-processes Meta webhooks left in RECEIVED when enqueue failed (e.g. Redis down). */
@Injectable()
export class MetaWebhookRecoveryService implements OnModuleInit {
  private readonly logger = new Logger(MetaWebhookRecoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookEventsRepository: WebhookEventsRepository,
    private readonly metaWebhookDispatch: MetaWebhookDispatchService,
  ) {}

  async onModuleInit(): Promise<void> {
    if ((process.env.NODE_ENV ?? 'development') === 'production') {
      return;
    }
    if (
      (process.env.META_WEBHOOK_RECOVERY_ON_STARTUP ?? 'true').toLowerCase() ===
      'false'
    ) {
      return;
    }

    const stuck = await this.prisma.webhookEvent.findMany({
      where: {
        provider: WebhookEventProvider.META,
        status: {
          in: [
            WebhookEventStatus.RECEIVED,
            WebhookEventStatus.FAILED,
            WebhookEventStatus.IGNORED,
          ],
        },
      },
      orderBy: { receivedAt: 'asc' },
      take: 50,
      select: { id: true, status: true, payload: true },
    });

    const toRecover = stuck.filter((event) => {
      if (
        event.status === WebhookEventStatus.RECEIVED ||
        event.status === WebhookEventStatus.FAILED
      ) {
        return true;
      }
      const body = (event.payload ?? {}) as Record<string, unknown>;
      return normalizeMetaWebhookPayload(body).messages.length > 0;
    });

    if (toRecover.length === 0) {
      return;
    }

    this.logger.log(
      `Recovering ${toRecover.length} Meta webhook(s) stuck or mis-marked IGNORED`,
    );

    for (const event of toRecover) {
      try {
        if (event.status === WebhookEventStatus.IGNORED) {
          await this.webhookEventsRepository.resetForReprocessing(
            event.id,
            (event.payload ?? {}) as Prisma.InputJsonValue,
          );
        }
        await this.metaWebhookDispatch.dispatch(event.id);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Recovery failed';
        this.logger.warn(`Meta webhook recovery failed for ${event.id}: ${message}`);
      }
    }
  }
}
