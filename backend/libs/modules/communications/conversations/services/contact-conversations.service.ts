import { HttpStatus, Injectable } from '@nestjs/common';
import { Contact, ConversationChannel, Prisma } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { MessagingStatusService } from '@app/modules/integrations/integrations/services/messaging-status.service';
import { ContactReplyChannelDto } from '../dto/contact-reply-channel-response.dto';
import { ConversationResponseDto } from '../dto/conversation-response.dto';
import { EnsureContactConversationDto } from '../dto/ensure-contact-conversation.dto';
import { ListMessagesQueryDto } from '../dto/list-messages-query.dto';
import { ConversationMessageResponseDto } from '../dto/conversation-response.dto';
import {
  toConversationMessageResponse,
  toConversationResponse,
} from '../mappers/conversation.mapper';
import { ConversationMessagesRepository } from '../repositories/conversation-messages.repository';
import { ConversationsRepository } from '../repositories/conversations.repository';
import { buildReplyChannelCandidates } from '../utils/contact-reply-channels.util';
import { resolveMetaParticipantId } from '../utils/contact-outbound-identity.util';
import { EmailConversationsService } from './email-conversations.service';
import { MetaConversationsService } from './meta-conversations.service';

@Injectable()
export class ContactConversationsService {
  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly conversationsRepository: ConversationsRepository,
    private readonly messagesRepository: ConversationMessagesRepository,
    private readonly messagingStatusService: MessagingStatusService,
    private readonly emailConversationsService: EmailConversationsService,
    private readonly metaConversationsService: MetaConversationsService,
  ) {}

  async listMessages(
    businessId: string,
    contactId: string,
    query: ListMessagesQueryDto,
  ): Promise<{
    items: ConversationMessageResponseDto[];
    meta: {
      total?: number;
      page?: number;
      limit: number;
      nextCursor?: string | null;
      prevCursor?: string | null;
      hasMore?: boolean;
    };
  }> {
    const contact = await this.requireContact(businessId, contactId);
    await this.relinkIdentityConversations(businessId, contact);
    const { limit, take } = getPaginationParams(query);

    if (query.cursor || query.latest) {
      const result = await this.messagesRepository.findManyByContactIdCursor(
        businessId,
        contact,
        {
          take,
          cursor: query.cursor,
          direction: query.direction ?? 'before',
          latest: query.latest,
        },
      );

      return {
        items: result.items.map(toConversationMessageResponse),
        meta: {
          limit,
          nextCursor: result.nextCursor,
          prevCursor: result.prevCursor,
          hasMore: result.hasMore,
        },
      };
    }

    const result = await this.messagesRepository.findManyByContactIdCursor(
      businessId,
      contact,
      {
        take,
        direction: 'after',
        latest: true,
      },
    );

    return {
      items: result.items.map(toConversationMessageResponse),
      meta: {
        limit,
        nextCursor: result.nextCursor,
        prevCursor: result.prevCursor,
        hasMore: result.hasMore,
      },
    };
  }

  async listReplyChannels(
    businessId: string,
    contactId: string,
  ): Promise<ContactReplyChannelDto[]> {
    const contact = await this.requireContact(businessId, contactId);
    await this.relinkIdentityConversations(businessId, contact);
    const conversations = await this.conversationsRepository.findByContactId(
      businessId,
      contactId,
    );

    const candidates = buildReplyChannelCandidates(contact, conversations);
    const channels: ContactReplyChannelDto[] = [];

    for (const candidate of candidates) {
      const messagingStatus =
        await this.messagingStatusService.getMessagingStatus(
          businessId,
          candidate.providerKey,
        );

      channels.push({
        channel: candidate.channel,
        providerKey: candidate.providerKey,
        conversationId: candidate.conversation?.id ?? null,
        readyForMessaging: messagingStatus.readyForMessaging,
        messagingStatus,
        unavailableReason: this.resolveUnavailableReason(
          candidate,
          messagingStatus.readyForMessaging,
          messagingStatus.warnings,
        ),
      });
    }

    return channels;
  }

  async ensureConversation(
    businessId: string,
    contactId: string,
    dto: EnsureContactConversationDto,
    actor: RequestUser,
  ): Promise<ConversationResponseDto> {
    const contact = await this.requireContact(businessId, contactId);
    const conversations = await this.conversationsRepository.findByContactId(
      businessId,
      contactId,
    );

    const existing = conversations.find((row) => row.channel === dto.channel);
    if (existing) {
      return toConversationResponse(existing);
    }

    if (dto.channel === ConversationChannel.EMAIL) {
      const email = contact.email?.trim().toLowerCase();
      if (!email) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'This contact has no email address. Add an email before starting an email thread.',
          HttpStatus.BAD_REQUEST,
        );
      }

      return this.emailConversationsService.startConversation(
        businessId,
        {
          toEmail: email,
          contactId: contact.id,
          subject: dto.subject,
          text: dto.text,
        },
        actor,
      );
    }

    if (
      dto.channel === ConversationChannel.WHATSAPP ||
      dto.channel === ConversationChannel.FACEBOOK ||
      dto.channel === ConversationChannel.INSTAGRAM
    ) {
      return this.metaConversationsService.startConversation(
        businessId,
        contact,
        dto.channel,
        actor,
        { text: dto.text },
      );
    }

    throw new AppException(
      ErrorCode.BAD_REQUEST,
      'This channel is not supported for outbound conversation start.',
      HttpStatus.BAD_REQUEST,
    );
  }

  private resolveUnavailableReason(
    candidate: {
      channel: ConversationChannel;
      hasIdentity: boolean;
      conversation: { id: string } | null;
    },
    readyForMessaging: boolean,
    warnings: string[],
  ): string | null {
    if (readyForMessaging) {
      return null;
    }

    if (warnings.length > 0) {
      return warnings.join(' ');
    }

    if (!candidate.conversation && !candidate.hasIdentity) {
      return `No ${candidate.channel.toLowerCase()} identity is available for this contact.`;
    }

    return 'Messaging is not ready for this channel.';
  }

  private async relinkIdentityConversations(
    businessId: string,
    contact: Contact,
  ): Promise<void> {
    const identityFilters: Prisma.ConversationWhereInput[] = [];

    const email = contact.email?.trim().toLowerCase();
    if (email) {
      identityFilters.push({
        channel: ConversationChannel.EMAIL,
        externalParticipantId: email,
      });
    }

    for (const channel of [
      ConversationChannel.WHATSAPP,
      ConversationChannel.FACEBOOK,
      ConversationChannel.INSTAGRAM,
    ]) {
      const participantId = resolveMetaParticipantId(contact, channel);
      if (participantId) {
        identityFilters.push({
          channel,
          externalParticipantId: participantId,
        });
      }
    }

    const mismatched =
      await this.conversationsRepository.findByChannelIdentities(
        businessId,
        identityFilters,
        contact.id,
      );

    if (mismatched.length === 0) {
      return;
    }

    const conversationIds = mismatched.map((row) => row.id);
    await this.conversationsRepository.reassignToContact(
      businessId,
      conversationIds,
      contact.id,
    );
    await this.messagesRepository.updateContactIdForConversations(
      conversationIds,
      contact.id,
    );
  }

  private async requireContact(businessId: string, contactId: string) {
    const contact = await this.contactRepository.findById(businessId, contactId);
    if (!contact) {
      throw new AppException(
        ErrorCode.CONTACT_NOT_FOUND,
        'Contact not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return contact;
  }

}
