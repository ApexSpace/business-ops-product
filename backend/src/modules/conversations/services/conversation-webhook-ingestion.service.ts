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
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '../../audit/constants/audit.constants';
import { AuditService } from '../../audit/services/audit.service';
import { normalizeMetaWebhookPayload } from '../adapters/meta/meta-inbound-normalizer';
import { NormalizedInboundMessage } from '../adapters/meta/meta-inbound.types';
import { ConversationContactResolverService } from './conversation-contact-resolver.service';
import { ConversationIntegrationRepository } from '../repositories/conversation-integration.repository';
import { ConversationMessagesRepository } from '../repositories/conversation-messages.repository';
import { ConversationsRepository } from '../repositories/conversations.repository';
import { WebhookEventsRepository } from '../repositories/webhook-events.repository';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class ConversationWebhookIngestionService {
  private readonly logger = new Logger(ConversationWebhookIngestionService.name);

  constructor(
    private readonly conversationIntegrationRepository: ConversationIntegrationRepository,
    private readonly conversationsRepository: ConversationsRepository,
    private readonly messagesRepository: ConversationMessagesRepository,
    private readonly contactResolver: ConversationContactResolverService,
    private readonly webhookEventsRepository: WebhookEventsRepository,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  async processMetaPayload(
    body: Record<string, unknown>,
    webhookEventId?: string,
  ): Promise<void> {
    const { messages, objectType } = normalizeMetaWebhookPayload(body);

    if (messages.length === 0) {
      if (webhookEventId) {
        await this.webhookEventsRepository.updateStatus(
          webhookEventId,
          WebhookEventStatus.IGNORED,
        );
      }
      return;
    }

    for (const inbound of messages) {
      try {
        await this.ingestInboundMessage(inbound, objectType);
        if (webhookEventId) {
          await this.webhookEventsRepository.updateStatus(
            webhookEventId,
            WebhookEventStatus.PROCESSED,
          );
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown ingestion error';
        this.logger.error(
          `Failed to ingest ${inbound.channel} message ${inbound.externalMessageId}: ${message}`,
        );
        if (webhookEventId) {
          await this.webhookEventsRepository.updateStatus(
            webhookEventId,
            WebhookEventStatus.FAILED,
            message,
          );
        }
      }
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

    const preview = inbound.text?.slice(0, 500) ?? '[Attachment]';
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
      conversation = await this.conversationsRepository.update(conversation.id, {
        contact: { connect: { id: contact.id } },
        resourceId: resource.id,
        lastMessageAt: messageAt,
        lastMessagePreview: preview,
        unreadCount: { increment: 1 },
        status:
          conversation.status === ConversationStatus.CLOSED
            ? ConversationStatus.OPEN
            : conversation.status,
      });
    }

    await this.messagesRepository.create({
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
      attachments: (inbound.attachments ?? undefined) as Prisma.InputJsonValue | undefined,
      status: MessageStatus.RECEIVED,
      receivedAt: messageAt,
      metadata: (inbound.rawMetadata ?? undefined) as Prisma.InputJsonValue | undefined,
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

  private async resolveResource(
    inbound: NormalizedInboundMessage,
    objectType: string | null,
  ) {
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
