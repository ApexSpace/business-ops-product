import { Injectable, Logger } from '@nestjs/common';
import { WebhookEventStatus } from '@prisma/client';
import { IdempotencyService } from '@app/core/idempotency/idempotency.service';
import type { ProcessResendWebhookPayload } from '@app/core/queue/queue.types';
import { WebhookEventsRepository } from '@app/modules/communications/conversations/repositories/webhook-events.repository';
import { ResendWebhookService } from '../../services/resend-webhook.service';

@Injectable()
export class ResendWebhookProcessor {
  private readonly logger = new Logger(ResendWebhookProcessor.name);

  constructor(
    private readonly webhookEventsRepository: WebhookEventsRepository,
    private readonly resendWebhookService: ResendWebhookService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async process(payload: ProcessResendWebhookPayload): Promise<void> {
    const event = await this.webhookEventsRepository.findById(payload.webhookEventId);
    if (!event) {
      this.logger.warn(`WebhookEvent ${payload.webhookEventId} not found`);
      return;
    }

    if (event.status === WebhookEventStatus.PROCESSED) {
      return;
    }

    if (event.externalEventId) {
      const claimed = await this.idempotencyService.claim(
        'resend-webhook',
        event.externalEventId,
      );
      if (!claimed) {
        this.logger.log(
          `Skipping duplicate Resend event ${event.externalEventId}`,
        );
        return;
      }
    }

    await this.resendWebhookService.processQueuedEvent(payload);
  }
}
