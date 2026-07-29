import { Injectable, Logger } from '@nestjs/common';
import { WebhookEventStatus } from '@prisma/client';
import { IdempotencyService } from '@app/core/idempotency/idempotency.service';
import type { ProcessTwilioSmsWebhookPayload } from '@app/core/queue/queue.types';
import { WebhookEventsRepository } from '@app/modules/communications/conversations/repositories/webhook-events.repository';
import { TwilioSmsWebhookService } from '../../services/twilio-sms-webhook.service';

@Injectable()
export class TwilioSmsWebhookProcessor {
  private readonly logger = new Logger(TwilioSmsWebhookProcessor.name);

  constructor(
    private readonly webhookEventsRepository: WebhookEventsRepository,
    private readonly twilioSmsWebhookService: TwilioSmsWebhookService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async process(payload: ProcessTwilioSmsWebhookPayload): Promise<void> {
    const event = await this.webhookEventsRepository.findById(
      payload.webhookEventId,
    );
    if (!event) {
      this.logger.warn(`WebhookEvent ${payload.webhookEventId} not found`);
      return;
    }

    if (event.status === WebhookEventStatus.PROCESSED) {
      return;
    }

    if (event.externalEventId) {
      const claimed = await this.idempotencyService.claim(
        'twilio-sms-webhook',
        event.externalEventId,
      );
      if (!claimed) {
        this.logger.log(
          `Skipping duplicate Twilio SMS event ${event.externalEventId}`,
        );
        return;
      }
    }

    try {
      await this.twilioSmsWebhookService.processWebhookEvent(event.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Twilio SMS webhook failed';
      await this.webhookEventsRepository.updateStatus(
        event.id,
        WebhookEventStatus.FAILED,
        message,
      );
      throw error;
    }
  }
}
