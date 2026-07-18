import { HttpStatus, Injectable } from '@nestjs/common';
import {
  Contact,
  ConversationChannel,
  ConversationStatus,
  Prisma,
} from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { SMS_PROVIDER_KEY } from '@app/modules/communications/sms/constants/sms-platform.constants';
import { SmsModeResolverService } from '@app/modules/integrations/twilio/services/sms-mode-resolver.service';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { ConversationResponseDto } from '../dto/conversation-response.dto';
import { toConversationResponse } from '../mappers/conversation.mapper';
import { ConversationsRepository } from '../repositories/conversations.repository';
import { resolveChannelMetadataKey } from '../utils/contact-channel-identity.util';
import { resolveSmsParticipantId } from '../utils/contact-outbound-identity.util';
import { ConversationMessagesService } from './conversation-messages.service';

@Injectable()
export class SmsConversationsService {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
    private readonly conversationMessagesService: ConversationMessagesService,
    private readonly contactRepository: ContactRepository,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly smsModeResolver: SmsModeResolverService,
  ) {}

  async startConversation(
    businessId: string,
    contact: Contact,
    actor: RequestUser,
    options?: { text?: string },
  ): Promise<ConversationResponseDto> {
    const participantId = resolveSmsParticipantId(contact);
    if (!participantId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'This contact has no phone number. Add a phone number before starting an SMS thread.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const smsContext = await this.smsModeResolver.resolveBusinessOwned(businessId);
    if (!smsContext?.resource || !smsContext.fromNumber) {
      throw new AppException(
        ErrorCode.CONVERSATION_CHANNEL_NOT_READY,
        'Connect your Twilio number in Settings → Integrations to start SMS conversations.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const resource = smsContext.resource;
    const fromNumber = smsContext.fromNumber;

    // Must match Twilio inbound normalizer: `${businessNumber}:${customerE164}`.
    const externalConversationId = `${fromNumber}:${participantId}`;

    let conversation =
      await this.conversationsRepository.findByExternalConversationId(
        businessId,
        ConversationChannel.SMS,
        externalConversationId,
      );

    if (!conversation) {
      conversation =
        await this.conversationsRepository.findByExternalParticipantId(
          businessId,
          ConversationChannel.SMS,
          participantId,
        );
    }

    if (conversation) {
      const patch: Prisma.ConversationUpdateInput = {};
      if (conversation.contactId !== contact.id) {
        patch.contact = { connect: { id: contact.id } };
      }
      // Rebind threads that were created against the platform SMS resource.
      if (conversation.resourceId !== resource.id) {
        patch.resourceId = resource.id;
        patch.externalConversationId = externalConversationId;
      }
      if (Object.keys(patch).length > 0) {
        await this.conversationsRepository.update(conversation.id, patch);
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
      channel: ConversationChannel.SMS,
      providerKey: SMS_PROVIDER_KEY,
      resourceId: resource.id,
      externalConversationId,
      externalParticipantId: participantId,
      externalPageId: null,
      title: contact.displayName ?? contact.firstName ?? null,
      status: ConversationStatus.OPEN,
      lastMessageAt: options?.text?.trim() ? new Date() : null,
      lastMessagePreview: options?.text?.trim()?.slice(0, 500) ?? null,
      unreadCount: 0,
      metadata: { source: 'contact.outbound' },
    });

    await this.auditService.log({
      actorUserId: actor.id ?? SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId,
      action: 'conversation.created',
      entityType: 'Conversation',
      entityId: conversation.id,
      metadata: { channel: ConversationChannel.SMS, source: 'contact.outbound' },
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

    await this.persistSmsIdentity(contact, participantId);

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

  private async persistSmsIdentity(
    contact: Contact,
    participantId: string,
  ): Promise<void> {
    const metadataKey = resolveChannelMetadataKey(ConversationChannel.SMS);
    const metadata = (contact.metadata ?? {}) as Record<string, unknown>;
    if (metadata[metadataKey] === participantId) {
      return;
    }

    await this.contactRepository.update(contact.businessId, contact.id, {
      metadata: {
        ...metadata,
        [metadataKey]: participantId,
        channel: ConversationChannel.SMS,
      } as Prisma.InputJsonValue,
    });
  }
}
