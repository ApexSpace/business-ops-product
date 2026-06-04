import { Injectable, Logger } from '@nestjs/common';
import {
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
import { BusinessIntegrationRepository } from '@app/modules/integrations/integrations/repositories/business-integration.repository';

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
  ) {}

  async process(payload: SendOutboundMessagePayload): Promise<void> {
    const scope = `send-message:${payload.messageId}`;
    const claimed = await this.idempotencyService.claim(scope, payload.messageId, 3600);
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
      await this.failMessage(payload, message.id, 'Conversation channel not ready');
      return;
    }

    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        payload.businessId,
        conversation.providerKey,
      );

    if (!integration || integration.status !== IntegrationStatus.CONNECTED) {
      await this.failMessage(payload, message.id, 'Integration not connected');
      return;
    }

    const adapter = this.adapterRegistry.getAdapter(conversation.channel);
    const preview = (message.text ?? '').slice(0, 500);
    const now = new Date();

    try {
      const result = await adapter.sendMessage({
        businessId: payload.businessId,
        resourceId: conversation.resourceId,
        externalRecipientId: conversation.externalParticipantId,
        text: message.text ?? '',
      });

      await this.messagesRepository.update(message.id, {
        externalMessageId: result.externalMessageId ?? undefined,
        status: MessageStatus.SENT,
        sentAt: now,
        metadata: (result.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      });

      await this.conversationsRepository.update(conversation.id, {
        lastMessageAt: now,
        lastMessagePreview: preview,
        unreadCount: 0,
      });

      await this.asyncJobRepository.markCompleted(payload.asyncJobId, {
        messageId: message.id,
        status: MessageStatus.SENT,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send message';
      await this.failMessage(payload, message.id, errorMessage);
      throw error;
    }
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
