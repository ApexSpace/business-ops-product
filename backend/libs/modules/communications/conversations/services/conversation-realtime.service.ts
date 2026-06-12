import { Injectable, Logger } from '@nestjs/common';
import { ConversationChannel, MessageStatus } from '@prisma/client';
import { RedisPubSubService } from '@app/core/realtime/redis-pub-sub.service';
import { ConversationMessageResponseDto } from '../dto/conversation-response.dto';

export const CONVERSATION_REALTIME_EVENTS = {
  messageReceived: 'conversation.message.received',
  messageUpdated: 'conversation.message.updated',
  conversationUpdated: 'conversation.updated',
} as const;

export interface ConversationRealtimePayload {
  conversationId: string;
  messageId?: string;
  status?: MessageStatus | string;
  channel?: ConversationChannel | string;
  id?: string;
  message?: ConversationMessageResponseDto;
}

@Injectable()
export class ConversationRealtimeService {
  private readonly logger = new Logger(ConversationRealtimeService.name);

  constructor(private readonly pubSub: RedisPubSubService) {}

  async publishMessageReceived(
    businessId: string,
    payload: ConversationRealtimePayload,
  ): Promise<void> {
    await this.publish(
      businessId,
      CONVERSATION_REALTIME_EVENTS.messageReceived,
      payload,
    );
  }

  async publishMessageUpdated(
    businessId: string,
    payload: ConversationRealtimePayload,
  ): Promise<void> {
    await this.publish(
      businessId,
      CONVERSATION_REALTIME_EVENTS.messageUpdated,
      payload,
    );
  }

  async publishConversationUpdated(
    businessId: string,
    payload: ConversationRealtimePayload,
  ): Promise<void> {
    await this.publish(
      businessId,
      CONVERSATION_REALTIME_EVENTS.conversationUpdated,
      { ...payload, id: payload.id ?? payload.conversationId },
    );
  }

  private async publish(
    businessId: string,
    event: string,
    payload: ConversationRealtimePayload,
  ): Promise<void> {
    if (!this.pubSub.isAvailable()) {
      return;
    }

    try {
      await this.pubSub.publish(businessId, event, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to publish ${event} for ${businessId}: ${message}`);
    }
  }
}
