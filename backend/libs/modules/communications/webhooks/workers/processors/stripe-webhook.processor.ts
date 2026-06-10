import { Injectable, Logger } from '@nestjs/common';
import { WebhookEventStatus } from '@prisma/client';
import { IdempotencyService } from '@app/core/idempotency/idempotency.service';
import type { ProcessStripeWebhookPayload } from '@app/core/queue/queue.types';
import { StripeWebhookDispatchService } from '@app/modules/integrations/integrations/stripe/services/stripe-webhook-dispatch.service';
import { WebhookEventsRepository } from '@app/modules/communications/conversations/repositories/webhook-events.repository';

@Injectable()
export class StripeWebhookProcessor {
  private readonly logger = new Logger(StripeWebhookProcessor.name);

  constructor(
    private readonly webhookEventsRepository: WebhookEventsRepository,
    private readonly stripeWebhookDispatch: StripeWebhookDispatchService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async process(payload: ProcessStripeWebhookPayload): Promise<void> {
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
        'stripe-webhook',
        event.externalEventId,
      );
      if (!claimed) {
        this.logger.log(
          `Skipping duplicate Stripe event ${event.externalEventId}`,
        );
        return;
      }
    }

    try {
      await this.stripeWebhookDispatch.dispatchStoredEvent(
        payload.webhookEventId,
        payload.source,
      );
      await this.webhookEventsRepository.updateStatus(
        event.id,
        WebhookEventStatus.PROCESSED,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Processing failed';
      await this.webhookEventsRepository.updateStatus(
        event.id,
        WebhookEventStatus.FAILED,
        message,
      );
      throw error;
    }
  }
}
