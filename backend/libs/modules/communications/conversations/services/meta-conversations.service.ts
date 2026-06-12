import { HttpStatus, Injectable } from '@nestjs/common';
import {
  Contact,
  ConversationChannel,
  ConversationStatus,
  IntegrationResourceType,
  Prisma,
} from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { IntegrationResourceRepository } from '@app/modules/integrations/integrations/repositories/integration-resource.repository';
import { AuditService } from '@app/modules/platform/audit/audit.service';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { ConversationResponseDto } from '../dto/conversation-response.dto';
import { toConversationResponse } from '../mappers/conversation.mapper';
import { ConversationsRepository } from '../repositories/conversations.repository';
import { buildExternalConversationId } from '../utils/conversation-external-id.util';
import { resolveChannelMetadataKey } from '../utils/contact-channel-identity.util';
import { resolveMetaParticipantId } from '../utils/contact-outbound-identity.util';
import { ConversationMessagesService } from './conversation-messages.service';

const CHANNEL_CONFIG: Record<
  ConversationChannel.WHATSAPP | ConversationChannel.FACEBOOK | ConversationChannel.INSTAGRAM,
  {
    providerKey: string;
    resourceType: IntegrationResourceType;
    identityLabel: string;
  }
> = {
  [ConversationChannel.WHATSAPP]: {
    providerKey: 'whatsapp',
    resourceType: IntegrationResourceType.PHONE_NUMBER,
    identityLabel: 'phone number or WhatsApp ID',
  },
  [ConversationChannel.FACEBOOK]: {
    providerKey: 'facebook',
    resourceType: IntegrationResourceType.FACEBOOK_PAGE,
    identityLabel: 'Facebook Messenger ID',
  },
  [ConversationChannel.INSTAGRAM]: {
    providerKey: 'instagram',
    resourceType: IntegrationResourceType.INSTAGRAM_ACCOUNT,
    identityLabel: 'Instagram user ID',
  },
};

@Injectable()
export class MetaConversationsService {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
    private readonly integrationResourceRepository: IntegrationResourceRepository,
    private readonly conversationMessagesService: ConversationMessagesService,
    private readonly contactRepository: ContactRepository,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async startConversation(
    businessId: string,
    contact: Contact,
    channel:
      | ConversationChannel.WHATSAPP
      | ConversationChannel.FACEBOOK
      | ConversationChannel.INSTAGRAM,
    actor: RequestUser,
    options?: { text?: string },
  ): Promise<ConversationResponseDto> {
    const config = CHANNEL_CONFIG[channel];
    const participantId = resolveMetaParticipantId(contact, channel);

    if (!participantId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `This contact has no ${config.identityLabel}. Add the required channel identity before starting a conversation.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const resource = await this.integrationResourceRepository.findDefault(
      businessId,
      config.providerKey,
      config.resourceType,
    );

    if (!resource) {
      throw new AppException(
        ErrorCode.CONVERSATION_CHANNEL_NOT_READY,
        `No default ${config.providerKey} resource is configured for this business.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const externalConversationId = buildExternalConversationId(
      channel,
      resource.externalId,
      participantId,
    );

    let conversation =
      await this.conversationsRepository.findByExternalConversationId(
        businessId,
        channel,
        externalConversationId,
      );

    if (!conversation) {
      conversation =
        await this.conversationsRepository.findByExternalParticipantId(
          businessId,
          channel,
          participantId,
        );
    }

    if (conversation) {
      if (conversation.contactId !== contact.id) {
        await this.conversationsRepository.update(conversation.id, {
          contact: { connect: { id: contact.id } },
        });
      }

      const refreshed = await this.conversationsRepository.findById(
        businessId,
        conversation.id,
      );
      if (!refreshed) {
        throw new AppException(
          ErrorCode.CONVERSATION_NOT_FOUND,
          'Conversation not found',
          HttpStatus.NOT_FOUND,
        );
      }

      if (options?.text?.trim()) {
        await this.conversationMessagesService.send(
          businessId,
          refreshed.id,
          { text: options.text.trim() },
          actor,
        );
      }

      return toConversationResponse(refreshed);
    }

    conversation = await this.conversationsRepository.create({
      business: { connect: { id: businessId } },
      contact: { connect: { id: contact.id } },
      channel,
      providerKey: config.providerKey,
      resourceId: resource.id,
      externalConversationId,
      externalParticipantId: participantId,
      externalPageId:
        channel === ConversationChannel.FACEBOOK ? resource.externalId : null,
      title: contact.displayName ?? contact.firstName ?? null,
      status: ConversationStatus.OPEN,
      lastMessageAt: options?.text?.trim() ? new Date() : null,
      lastMessagePreview: options?.text?.trim()?.slice(0, 500) ?? null,
      unreadCount: 0,
      metadata: { source: 'contact.outbound' } as Prisma.InputJsonValue,
    });

    await this.auditService.log({
      actorUserId: actor.id ?? SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId,
      action: 'conversation.created',
      entityType: 'Conversation',
      entityId: conversation.id,
      metadata: { channel, source: 'contact.outbound' },
    });

    await this.prisma.conversationParticipant.upsert({
      where: {
        conversationId_externalParticipantId: {
          conversationId: conversation.id,
          externalParticipantId: participantId,
        },
      },
      create: {
        business: { connect: { id: businessId } },
        conversation: { connect: { id: conversation.id } },
        contact: { connect: { id: contact.id } },
        externalParticipantId: participantId,
        name: contact.displayName ?? contact.firstName,
        profilePictureUrl: contact.avatarUrl,
      },
      update: {
        contact: { connect: { id: contact.id } },
        name: contact.displayName ?? contact.firstName,
        profilePictureUrl: contact.avatarUrl,
      },
    });

    if (channel === ConversationChannel.WHATSAPP) {
      await this.persistWhatsAppIdentity(contact, participantId);
    } else {
      await this.persistChannelIdentity(contact, channel, participantId);
    }

    if (options?.text?.trim()) {
      await this.conversationMessagesService.send(
        businessId,
        conversation.id,
        { text: options.text.trim() },
        actor,
      );
    }

    const created = await this.conversationsRepository.findById(
      businessId,
      conversation.id,
    );
    if (!created) {
      throw new AppException(
        ErrorCode.CONVERSATION_NOT_FOUND,
        'Conversation not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return toConversationResponse(created);
  }

  private async persistWhatsAppIdentity(
    contact: Contact,
    participantId: string,
  ): Promise<void> {
    const metadata = (contact.metadata ?? {}) as Record<string, unknown>;
    if (metadata.whatsappWaId === participantId) {
      return;
    }

    await this.contactRepository.update(contact.businessId, contact.id, {
      metadata: {
        ...metadata,
        whatsappWaId: participantId,
        channel: ConversationChannel.WHATSAPP,
      } as Prisma.InputJsonValue,
    });
  }

  private async persistChannelIdentity(
    contact: Contact,
    channel: ConversationChannel,
    participantId: string,
  ): Promise<void> {
    const metadataKey = resolveChannelMetadataKey(channel);
    const metadata = (contact.metadata ?? {}) as Record<string, unknown>;
    if (metadata[metadataKey] === participantId) {
      return;
    }

    await this.contactRepository.update(contact.businessId, contact.id, {
      metadata: {
        ...metadata,
        [metadataKey]: participantId,
        channel,
      } as Prisma.InputJsonValue,
    });
  }
}
