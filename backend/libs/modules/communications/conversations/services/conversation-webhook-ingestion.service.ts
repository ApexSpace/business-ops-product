import { Injectable, Logger } from '@nestjs/common';
import {
  ConversationChannel,
  ConversationDirection,
  ConversationStatus,
  IntegrationResourceType,
  MessageSenderType,
  MessageStatus,
  Prisma,
  WebhookEventStatus,
} from '@prisma/client';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { previewFromMessageContent } from '../adapters/meta/meta-attachment.util';
import {
  extractWhatsAppDeliveryStatuses,
  normalizeMetaWebhookPayload,
} from '../adapters/meta/meta-inbound-normalizer';
import { NormalizedInboundMessage } from '../adapters/meta/meta-inbound.types';
import { ConversationContactResolverService } from './conversation-contact-resolver.service';
import { ConversationRealtimeService } from './conversation-realtime.service';
import { ConversationIntegrationRepository } from '../repositories/conversation-integration.repository';
import { ConversationMessagesRepository } from '../repositories/conversation-messages.repository';
import { ConversationsRepository } from '../repositories/conversations.repository';
import { WebhookEventsRepository } from '../repositories/webhook-events.repository';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class ConversationWebhookIngestionService {
  private readonly logger = new Logger(
    ConversationWebhookIngestionService.name,
  );

  constructor(
    private readonly conversationIntegrationRepository: ConversationIntegrationRepository,
    private readonly conversationsRepository: ConversationsRepository,
    private readonly messagesRepository: ConversationMessagesRepository,
    private readonly contactResolver: ConversationContactResolverService,
    private readonly webhookEventsRepository: WebhookEventsRepository,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
    private readonly realtime: ConversationRealtimeService,
  ) {}

  async ingestNormalizedInbound(inbound: NormalizedInboundMessage): Promise<void> {
    await this.ingestInboundMessage(inbound, null);
  }

  async processMetaPayload(
    body: Record<string, unknown>,
    webhookEventId?: string,
  ): Promise<void> {
    const { messages, objectType } = normalizeMetaWebhookPayload(body);
    const deliveryStatuses = extractWhatsAppDeliveryStatuses(body);

    if (deliveryStatuses.length > 0) {
      await this.applyWhatsAppDeliveryStatuses(deliveryStatuses);
    }

    if (messages.length === 0) {
      if (webhookEventId) {
        await this.webhookEventsRepository.updateStatus(
          webhookEventId,
          deliveryStatuses.length > 0
            ? WebhookEventStatus.PROCESSED
            : WebhookEventStatus.IGNORED,
        );
      }
      return;
    }

    let lastError: string | undefined;

    for (const inbound of messages) {
      try {
        await this.ingestInboundMessage(inbound, objectType);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown ingestion error';
        lastError = message;
        this.logger.error(
          `Failed to ingest ${inbound.channel} message ${inbound.externalMessageId}: ${message}`,
        );
      }
    }

    if (webhookEventId) {
      await this.webhookEventsRepository.updateStatus(
        webhookEventId,
        lastError ? WebhookEventStatus.FAILED : WebhookEventStatus.PROCESSED,
        lastError,
      );
    }
  }

  private async ingestInboundMessage(
    inbound: NormalizedInboundMessage,
    objectType: string | null,
  ): Promise<void> {
    const resource = await this.resolveResource(inbound, objectType);
    if (!resource) {
      this.logger.warn(
        `No integration resource for ${inbound.channel} externalId=${inbound.externalResourceId}`,
      );
      return;
    }

    const businessId = resource.businessId;

    const existingMessage =
      await this.messagesRepository.findByExternalMessageId(
        businessId,
        inbound.channel,
        inbound.externalMessageId,
      );
    if (existingMessage) {
      return;
    }

    const contact = await this.contactResolver.resolveOrCreateContact(
      businessId,
      inbound,
      resource,
    );

    let conversation =
      await this.conversationsRepository.findByExternalConversationId(
        businessId,
        inbound.channel,
        inbound.externalConversationId,
      );

    const preview = previewFromMessageContent(inbound.text, inbound.attachments);
    const messageAt = inbound.timestamp;

    if (!conversation) {
      conversation = await this.conversationsRepository.create({
        business: { connect: { id: businessId } },
        contact: { connect: { id: contact.id } },
        channel: inbound.channel,
        providerKey: inbound.providerKey,
        resourceId: resource.id,
        externalConversationId: inbound.externalConversationId,
        externalParticipantId: inbound.externalParticipantId,
        externalPageId: inbound.externalPageId,
        title: contact.displayName ?? contact.firstName ?? null,
        status: ConversationStatus.OPEN,
        lastMessageAt: messageAt,
        lastMessagePreview: preview,
        unreadCount: 1,
        metadata: { objectType },
      });

      await this.auditService.log({
        actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
        businessId,
        action: 'conversation.created',
        entityType: 'Conversation',
        entityId: conversation.id,
        metadata: { channel: inbound.channel },
      });

      await this.prisma.conversationParticipant.upsert({
        where: {
          conversationId_externalParticipantId: {
            conversationId: conversation.id,
            externalParticipantId: inbound.externalParticipantId,
          },
        },
        create: {
          business: { connect: { id: businessId } },
          conversation: { connect: { id: conversation.id } },
          contact: { connect: { id: contact.id } },
          externalParticipantId: inbound.externalParticipantId,
          name: contact.displayName ?? contact.firstName,
          profilePictureUrl: contact.avatarUrl,
        },
        update: {
          contact: { connect: { id: contact.id } },
          name: contact.displayName ?? contact.firstName,
          profilePictureUrl: contact.avatarUrl,
        },
      });
    } else {
      conversation = await this.conversationsRepository.update(
        conversation.id,
        {
          contact: { connect: { id: contact.id } },
          resourceId: resource.id,
          lastMessageAt: messageAt,
          lastMessagePreview: preview,
          unreadCount: { increment: 1 },
          status:
            conversation.status === ConversationStatus.CLOSED
              ? ConversationStatus.OPEN
              : conversation.status,
        },
      );
    }

    const createdMessage = await this.messagesRepository.create({
      business: { connect: { id: businessId } },
      conversation: { connect: { id: conversation.id } },
      contact: { connect: { id: contact.id } },
      channel: inbound.channel,
      providerKey: inbound.providerKey,
      direction: ConversationDirection.INBOUND,
      senderType: MessageSenderType.CONTACT,
      externalMessageId: inbound.externalMessageId,
      externalSenderId: inbound.externalSenderId,
      externalRecipientId: inbound.externalRecipientId,
      text: inbound.text,
      attachments: (inbound.attachments ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
      status: MessageStatus.RECEIVED,
      receivedAt: messageAt,
      metadata: (inbound.rawMetadata ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
    });

    this.logger.log(
      `Ingested ${inbound.channel} message ${inbound.externalMessageId} → conversation ${conversation.id}`,
    );

    await this.realtime.publishMessageReceived(businessId, {
      conversationId: conversation.id,
      messageId: createdMessage.id,
      status: MessageStatus.RECEIVED,
      channel: inbound.channel,
    });

    await this.realtime.publishConversationUpdated(businessId, {
      conversationId: conversation.id,
      channel: inbound.channel,
    });

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId,
      action: 'conversation.message.received',
      entityType: 'ConversationMessage',
      entityId: inbound.externalMessageId,
      metadata: {
        conversationId: conversation.id,
        channel: inbound.channel,
      },
    });
  }

  private async applyWhatsAppDeliveryStatuses(
    statuses: ReturnType<typeof extractWhatsAppDeliveryStatuses>,
  ): Promise<void> {
    for (const status of statuses) {
      const message =
        await this.messagesRepository.findByChannelExternalMessageId(
          ConversationChannel.WHATSAPP,
          status.externalMessageId,
        );
      if (!message) {
        continue;
      }

      const nextStatus = this.mapWhatsAppDeliveryStatus(status.status);
      if (!nextStatus || !this.shouldApplyDeliveryStatus(message.status, nextStatus)) {
        continue;
      }

      await this.messagesRepository.update(message.id, {
        status: nextStatus,
        ...(nextStatus === MessageStatus.FAILED
          ? { errorMessage: status.errorMessage ?? 'WhatsApp delivery failed' }
          : {}),
      });

      await this.realtime.publishMessageUpdated(message.businessId, {
        conversationId: message.conversationId,
        messageId: message.id,
        status: nextStatus,
        channel: ConversationChannel.WHATSAPP,
      });
    }
  }

  private mapWhatsAppDeliveryStatus(
    status: 'sent' | 'delivered' | 'read' | 'failed',
  ): MessageStatus | null {
    switch (status) {
      case 'sent':
        return MessageStatus.SENT;
      case 'delivered':
        return MessageStatus.DELIVERED;
      case 'read':
        return MessageStatus.READ;
      case 'failed':
        return MessageStatus.FAILED;
      default:
        return null;
    }
  }

  private shouldApplyDeliveryStatus(
    current: MessageStatus,
    next: MessageStatus,
  ): boolean {
    const rank: Record<MessageStatus, number> = {
      [MessageStatus.RECEIVED]: 0,
      [MessageStatus.PENDING]: 1,
      [MessageStatus.SENT]: 2,
      [MessageStatus.DELIVERED]: 3,
      [MessageStatus.READ]: 4,
      [MessageStatus.FAILED]: 5,
    };

    if (next === MessageStatus.FAILED) {
      return current !== MessageStatus.READ;
    }

    return rank[next] > rank[current];
  }

  private async resolveResource(
    inbound: NormalizedInboundMessage,
    objectType: string | null,
  ) {
    if (inbound.channel === ConversationChannel.EMAIL) {
      return this.conversationIntegrationRepository.findDefaultEmailResourceForBusiness(
        inbound.externalResourceId,
      );
    }

    if (
      inbound.channel === ConversationChannel.WHATSAPP ||
      objectType === 'whatsapp' ||
      objectType === 'whatsapp_business_account'
    ) {
      return this.conversationIntegrationRepository.findResourceByExternalId(
        inbound.externalResourceId,
        IntegrationResourceType.PHONE_NUMBER,
      );
    }

    if (
      inbound.channel === ConversationChannel.FACEBOOK ||
      objectType === 'page'
    ) {
      return this.conversationIntegrationRepository.findResourceByExternalId(
        inbound.externalResourceId,
        IntegrationResourceType.FACEBOOK_PAGE,
      );
    }

    let resource =
      await this.conversationIntegrationRepository.findResourceByExternalId(
        inbound.externalResourceId,
        IntegrationResourceType.INSTAGRAM_ACCOUNT,
      );

    if (!resource && inbound.externalPageId) {
      resource =
        await this.conversationIntegrationRepository.findInstagramResourceByLinkedPageId(
          inbound.externalPageId,
        );
    }

    return resource;
  }
}
