import { Injectable, Logger } from '@nestjs/common';
import { WebhookEventProvider, WebhookEventStatus } from '@prisma/client';
import { IdempotencyService } from '@app/core/idempotency/idempotency.service';
import type { ProcessMetaWebhookPayload } from '@app/core/queue/queue.types';
import { ConversationWebhookIngestionService } from '@app/modules/communications/conversations/services/conversation-webhook-ingestion.service';
import { WebhookEventsRepository } from '@app/modules/communications/conversations/repositories/webhook-events.repository';

@Injectable()
export class MetaWebhookProcessor {
  private readonly logger = new Logger(MetaWebhookProcessor.name);

  constructor(
    private readonly webhookEventsRepository: WebhookEventsRepository,
    private readonly conversationWebhookIngestion: ConversationWebhookIngestionService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async process(payload: ProcessMetaWebhookPayload): Promise<void> {
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
      const existing =
        await this.webhookEventsRepository.findByProviderAndExternalId(
          WebhookEventProvider.META,
          event.externalEventId,
        );
      if (
        existing &&
        existing.id !== event.id &&
        existing.status === WebhookEventStatus.PROCESSED
      ) {
        await this.webhookEventsRepository.updateStatus(
          event.id,
          WebhookEventStatus.IGNORED,
        );
        return;
      }

      const claimed = await this.idempotencyService.claim(
        'meta-webhook',
        event.externalEventId,
      );
      if (!claimed) {
        this.logger.log(
          `Skipping duplicate Meta event ${event.externalEventId}`,
        );
        return;
      }
    }

    const body = (event.payload ?? {}) as Record<string, unknown>;
    const object = body.object as string | undefined;

    try {
      if (object === 'page' || object === 'instagram') {
        await this.conversationWebhookIngestion.processMetaPayload(
          body,
          event.id,
        );
      } else {
        await this.webhookEventsRepository.updateStatus(
          event.id,
          WebhookEventStatus.IGNORED,
        );
      }
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
