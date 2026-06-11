import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  Prisma,
  WebhookEventProvider,
  WebhookEventStatus,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { WebhookEventsRepository } from '@app/modules/communications/conversations/repositories/webhook-events.repository';
import { ResendWebhookDispatchService } from './resend-webhook-dispatch.service';

type ResendWebhookPayload = {
  type?: string;
};

function isResendInboundEmailPayload(payload: unknown): boolean {
  const event = payload as ResendWebhookPayload;
  return event?.type === 'email.received';
}

/** Re-processes Resend webhooks left in RECEIVED when enqueue failed (e.g. Redis down). */
@Injectable()
export class ResendWebhookRecoveryService implements OnModuleInit {
  private readonly logger = new Logger(ResendWebhookRecoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookEventsRepository: WebhookEventsRepository,
    private readonly resendWebhookDispatch: ResendWebhookDispatchService,
  ) {}

  async onModuleInit(): Promise<void> {
    if ((process.env.NODE_ENV ?? 'development') === 'production') {
      return;
    }
    if (
      (process.env.RESEND_WEBHOOK_RECOVERY_ON_STARTUP ?? 'true').toLowerCase() ===
      'false'
    ) {
      return;
    }

    const stuck = await this.prisma.webhookEvent.findMany({
      where: {
        provider: WebhookEventProvider.RESEND,
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
      return isResendInboundEmailPayload(event.payload);
    });

    if (toRecover.length === 0) {
      return;
    }

    this.logger.log(
      `Recovering ${toRecover.length} Resend webhook(s) stuck or mis-marked IGNORED`,
    );

    for (const event of toRecover) {
      try {
        if (event.status === WebhookEventStatus.IGNORED) {
          await this.webhookEventsRepository.resetForReprocessing(
            event.id,
            (event.payload ?? {}) as Prisma.InputJsonValue,
          );
        }
        await this.resendWebhookDispatch.dispatch(event.id);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Recovery failed';
        this.logger.warn(`Resend webhook recovery failed for ${event.id}: ${message}`);
      }
    }
  }
}
