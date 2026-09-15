import { Injectable, Logger } from '@nestjs/common';
import { WebhookEventProvider, WebhookEventStatus } from '@prisma/client';
import { IdempotencyService } from '@app/core/idempotency/idempotency.service';
import type { ProcessMetaWebhookPayload } from '@app/core/queue/queue.types';
import { isWhatsAppWebhookObject } from '@app/modules/communications/conversations/adapters/meta/meta-inbound-normalizer';
import { ConversationWebhookIngestionService } from '@app/modules/communications/conversations/services/conversation-webhook-ingestion.service';
import { WebhookEventsRepository } from '@app/modules/communications/conversations/repositories/webhook-events.repository';
import { WhatsAppTemplateWebhookService } from '@app/modules/integrations/whatsapp/services/whatsapp-template-webhook.service';
import { extractWhatsAppTemplateStatusUpdates } from '@app/modules/integrations/whatsapp/utils/template-webhook.util';
import { hasMetaSocialCommentChanges } from '@app/modules/integrations/integrations/meta/utils/meta-webhook-event-id.util';
import { SocialCommentIngestionService } from '@app/modules/communications/social-planner/services/social-comment-ingestion.service';

@Injectable()
export class MetaWebhookProcessor {
  private readonly logger = new Logger(MetaWebhookProcessor.name);

  constructor(
    private readonly webhookEventsRepository: WebhookEventsRepository,
    private readonly conversationWebhookIngestion: ConversationWebhookIngestionService,
    private readonly socialCommentIngestion: SocialCommentIngestionService,
    private readonly idempotencyService: IdempotencyService,
    private readonly whatsAppTemplateWebhookService: WhatsAppTemplateWebhookService,
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
      if (
        object === 'page' ||
        object === 'instagram' ||
        isWhatsAppWebhookObject(object ?? null)
      ) {
        if (isWhatsAppWebhookObject(object ?? null)) {
          const templateUpdates = extractWhatsAppTemplateStatusUpdates(body);
          if (templateUpdates.length > 0) {
            await this.whatsAppTemplateWebhookService.processStatusUpdates(
              templateUpdates,
            );
          }
        }

        let commentHandled = false;
        if (hasMetaSocialCommentChanges(body)) {
          commentHandled =
            await this.socialCommentIngestion.processMetaPayload(body);
        }

        await this.conversationWebhookIngestion.processMetaPayload(
          body,
          event.id,
        );

        // Conversation ingestion marks feed-only payloads IGNORED; promote to
        // PROCESSED when we successfully handled social comments.
        if (commentHandled) {
          const refreshed = await this.webhookEventsRepository.findById(
            event.id,
          );
          if (refreshed?.status === WebhookEventStatus.IGNORED) {
            await this.webhookEventsRepository.updateStatus(
              event.id,
              WebhookEventStatus.PROCESSED,
            );
          }
        }
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
