import { Injectable, Logger } from '@nestjs/common';
import {
  ConversationChannel,
  IntegrationStatus,
  MessageStatus,
  Prisma,
} from '@prisma/client';
import { AsyncJobRepository } from '@app/core/jobs/async-job.repository';
import { IdempotencyService } from '@app/core/idempotency/idempotency.service';
import type { SendOutboundMessagePayload } from '@app/core/queue/queue.types';
import { ConversationChannelAdapterRegistry } from '@app/modules/communications/conversations/adapters/conversation-channel-adapter.registry';
import { ConversationMessagesRepository } from '@app/modules/communications/conversations/repositories/conversation-messages.repository';
import { ConversationsRepository } from '@app/modules/communications/conversations/repositories/conversations.repository';
import { WEBCHAT_PROVIDER_KEY } from '@app/modules/communications/chatbots/utils/chatbot-public-key.util';
import { isPlatformEmailConversation } from '@app/modules/communications/email/utils/platform-email-channel.util';
import { BusinessIntegrationRepository } from '@app/modules/integrations/integrations/repositories/business-integration.repository';
import type { ChannelMessageAttachment } from '@app/modules/communications/conversations/adapters/conversation-channel-adapter.interface';
import { previewFromMessageContent } from '@app/modules/communications/conversations/adapters/meta/meta-attachment.util';
import { ConversationRealtimeService } from '@app/modules/communications/conversations/services/conversation-realtime.service';
import { ConversationWebhookIngestionService } from '@app/modules/communications/conversations/services/conversation-webhook-ingestion.service';

@Injectable()
export class SendMessageProcessor {
  private readonly logger = new Logger(SendMessageProcessor.name);

  constructor(
    private readonly messagesRepository: ConversationMessagesRepository,
    private readonly conversationsRepository: ConversationsRepository,
    private readonly adapterRegistry: ConversationChannelAdapterRegistry,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly asyncJobRepository: AsyncJobRepository,
    private readonly idempotencyService: IdempotencyService,
    private readonly realtime: ConversationRealtimeService,
    private readonly conversationWebhookIngestion: ConversationWebhookIngestionService,
  ) {}

  async process(payload: SendOutboundMessagePayload): Promise<void> {
    const scope = `send-message:${payload.messageId}`;
    const claimed = await this.idempotencyService.claim(
      scope,
      payload.messageId,
      3600,
    );
    if (!claimed) {
      this.logger.log(`Send message ${payload.messageId} already processing`);
      return;
    }

    await this.asyncJobRepository.markActive(payload.asyncJobId);

    const message = await this.messagesRepository.findById(
      payload.businessId,
      payload.messageId,
    );
    if (!message || message.status !== MessageStatus.PENDING) {
      await this.asyncJobRepository.markFailed(
        payload.asyncJobId,
        'Message not found or not pending',
      );
      return;
    }

    const conversation = await this.conversationsRepository.findById(
      payload.businessId,
      message.conversationId,
    );
    if (!conversation?.resourceId) {
      await this.failMessage(
        payload,
        message.id,
        'Conversation channel not ready',
      );
      return;
    }

    const isWebchat =
      conversation.channel === ConversationChannel.WEBCHAT &&
      conversation.providerKey === WEBCHAT_PROVIDER_KEY;
    const isPlatformEmail = isPlatformEmailConversation(
      conversation.channel,
      conversation.providerKey,
    );

    if (!isWebchat && !isPlatformEmail) {
      const integration =
        await this.businessIntegrationRepository.findByBusinessAndKey(
          payload.businessId,
          conversation.providerKey,
        );

      if (!integration || integration.status !== IntegrationStatus.CONNECTED) {
        await this.failMessage(
          payload,
          message.id,
          'Integration not connected',
        );
        return;
      }
    }

    const adapter = this.adapterRegistry.getAdapter(conversation.channel);
    const attachments = this.readAttachments(message.attachments);
    const preview = previewFromMessageContent(message.text, attachments);
    const now = new Date();

    try {
      const result = await adapter.sendMessage({
        businessId: payload.businessId,
        resourceId: conversation.resourceId,
        externalRecipientId: conversation.externalParticipantId,
        text: message.text ?? '',
        attachments,
        metadata: {
          conversationId: conversation.id,
          messageId: message.id,
          subject:
            typeof (message.metadata as Record<string, unknown> | null)?.subject ===
            'string'
              ? ((message.metadata as Record<string, unknown>).subject as string)
              : conversation.title ?? undefined,
        },
      });

      const externalMessageId = result.externalMessageId?.trim() || undefined;

      await this.messagesRepository.update(message.id, {
        externalMessageId,
        status: MessageStatus.SENT,
        sentAt: now,
        metadata: (result.metadata ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
      });

      if (
        externalMessageId &&
        conversation.channel === ConversationChannel.WHATSAPP
      ) {
        await this.conversationWebhookIngestion.replayBufferedWhatsAppDeliveryStatuses(
          externalMessageId,
        );
      }

      await this.conversationsRepository.update(conversation.id, {
        lastMessageAt: now,
        lastMessagePreview: preview,
        unreadCount: 0,
      });

      const freshMessage = await this.messagesRepository.findById(
        payload.businessId,
        message.id,
      );
      const finalStatus = freshMessage?.status ?? MessageStatus.SENT;

      await this.realtime.publishMessageUpdated(payload.businessId, {
        conversationId: conversation.id,
        messageId: message.id,
        status: finalStatus,
        channel: conversation.channel,
      });

      await this.realtime.publishConversationUpdated(payload.businessId, {
        conversationId: conversation.id,
        channel: conversation.channel,
      });

      await this.asyncJobRepository.markCompleted(payload.asyncJobId, {
        messageId: message.id,
        status: finalStatus,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send message';
      await this.failMessage(payload, message.id, errorMessage);

      await this.realtime.publishMessageUpdated(payload.businessId, {
        conversationId: conversation.id,
        messageId: message.id,
        status: MessageStatus.FAILED,
        channel: conversation.channel,
      });

      throw error;
    }
  }

  private readAttachments(value: unknown): ChannelMessageAttachment[] | undefined {
    if (!Array.isArray(value) || value.length === 0) {
      return undefined;
    }

    const attachments = value
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const record = item as Record<string, unknown>;
        const type = typeof record.type === 'string' ? record.type.trim() : '';
        const url = typeof record.url === 'string' ? record.url.trim() : '';
        if (!type || !url) return null;
        return { type, url };
      })
      .filter((item): item is ChannelMessageAttachment => item !== null);

    return attachments.length > 0 ? attachments : undefined;
  }

  private async failMessage(
    payload: SendOutboundMessagePayload,
    messageId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.messagesRepository.update(messageId, {
      status: MessageStatus.FAILED,
      errorMessage,
    });
    await this.asyncJobRepository.markFailed(payload.asyncJobId, errorMessage);
  }
}
