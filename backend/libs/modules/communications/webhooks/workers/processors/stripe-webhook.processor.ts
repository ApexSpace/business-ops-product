import { Injectable, Logger } from '@nestjs/common';
import { WebhookEventStatus } from '@prisma/client';
import { IdempotencyService } from '@app/core/idempotency/idempotency.service';
import type { ProcessStripeWebhookPayload } from '@app/core/queue/queue.types';
import { StripeWebhookDispatchService } from '@app/modules/integrations/integrations/stripe/services/stripe-webhook-dispatch.service';
import { WebhookEventsRepository } from '@app/modules/communications/conversations/repositories/webhook-events.repository';

const STRIPE_WEBHOOK_CLAIM_SCOPE = 'stripe-webhook';

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

    const locked = await this.acquireProcessingLock(event);
    if (!locked) {
      return;
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
      if (event.externalEventId) {
        await this.idempotencyService.release(
          STRIPE_WEBHOOK_CLAIM_SCOPE,
          event.externalEventId,
        );
      }
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

  /**
   * Exclusive claim so two workers do not dispatch the same Stripe event.
   * FAILED rows must be allowed to retry: release leftover claims and reprocess.
   * Claim-miss on RECEIVED means another worker is in flight — skip, do not
   * treat FAILED as success.
   */
  private async acquireProcessingLock(event: {
    id: string;
    externalEventId: string | null;
    status: WebhookEventStatus;
  }): Promise<boolean> {
    if (!event.externalEventId) {
      return true;
    }

    const claimed = await this.idempotencyService.claim(
      STRIPE_WEBHOOK_CLAIM_SCOPE,
      event.externalEventId,
    );
    if (claimed) {
      return true;
    }

    const latest = await this.webhookEventsRepository.findById(event.id);
    if (!latest || latest.status === WebhookEventStatus.PROCESSED) {
      this.logger.log(
        `Skipping duplicate Stripe event ${event.externalEventId}`,
      );
      return false;
    }

    if (latest.status === WebhookEventStatus.FAILED) {
      await this.idempotencyService.release(
        STRIPE_WEBHOOK_CLAIM_SCOPE,
        event.externalEventId,
      );
      const reclaimed = await this.idempotencyService.claim(
        STRIPE_WEBHOOK_CLAIM_SCOPE,
        event.externalEventId,
      );
      if (reclaimed) {
        this.logger.log(
          `Retrying failed Stripe event ${event.externalEventId}`,
        );
        return true;
      }
      this.logger.log(
        `Skipping Stripe event ${event.externalEventId}: another worker claimed the FAILED retry`,
      );
      return false;
    }

    this.logger.log(
      `Skipping in-flight Stripe event ${event.externalEventId}`,
    );
    return false;
  }
}
