import { Injectable } from '@nestjs/common';
import {
  Contact,
  Conversation,
  ConversationChannel,
  Prisma,
} from '@prisma/client';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { IntegrationResourceRepository } from '@app/modules/integrations/integrations/repositories/integration-resource.repository';
import { PrismaService } from '@app/core/database/prisma.service';
import { buildExternalConversationId } from '../utils/conversation-external-id.util';
import { resolveWhatsAppParticipantId } from '../utils/contact-outbound-identity.util';
import { ConversationsRepository } from '../repositories/conversations.repository';

@Injectable()
export class WhatsAppParticipantSyncService {
  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly conversationsRepository: ConversationsRepository,
    private readonly resourceRepository: IntegrationResourceRepository,
    private readonly prisma: PrismaService,
  ) {}

  async syncContactWhatsAppIdentity(
    businessId: string,
    contact: Contact,
  ): Promise<void> {
    const participantId = resolveWhatsAppParticipantId(contact);
    if (!participantId) {
      return;
    }

    await this.persistContactWaId(contact, participantId);
    await this.syncConversationsForContact(businessId, contact.id, participantId);
  }

  async resolveSendRecipient(
    businessId: string,
    conversation: Conversation,
  ): Promise<string> {
    if (conversation.channel !== ConversationChannel.WHATSAPP) {
      return conversation.externalParticipantId;
    }

    if (!conversation.contactId) {
      return conversation.externalParticipantId;
    }

    const contact = await this.contactRepository.findById(
      businessId,
      conversation.contactId,
    );
    if (!contact) {
      return conversation.externalParticipantId;
    }

    const participantId = resolveWhatsAppParticipantId(contact);
    if (!participantId) {
      return conversation.externalParticipantId;
    }

    await this.persistContactWaId(contact, participantId);
    if (conversation.externalParticipantId !== participantId) {
      await this.updateConversationParticipant(
        businessId,
        conversation,
        participantId,
      );
    }

    return participantId;
  }

  private async persistContactWaId(
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

  private async syncConversationsForContact(
    businessId: string,
    contactId: string,
    participantId: string,
  ): Promise<void> {
    const conversations = await this.conversationsRepository.findByContactId(
      businessId,
      contactId,
    );

    for (const conversation of conversations) {
      if (
        conversation.channel !== ConversationChannel.WHATSAPP ||
        conversation.externalParticipantId === participantId
      ) {
        continue;
      }

      await this.updateConversationParticipant(
        businessId,
        conversation,
        participantId,
      );
    }
  }

  private async updateConversationParticipant(
    businessId: string,
    conversation: Conversation,
    participantId: string,
  ): Promise<void> {
    if (!conversation.resourceId) {
      return;
    }

    const resource = await this.resourceRepository.findByIdAndBusiness(
      conversation.resourceId,
      businessId,
    );

    const externalConversationId = resource
      ? buildExternalConversationId(
          ConversationChannel.WHATSAPP,
          resource.externalId,
          participantId,
        )
      : undefined;

    await this.conversationsRepository.update(conversation.id, {
      externalParticipantId: participantId,
      ...(externalConversationId
        ? { externalConversationId }
        : {}),
    });

    await this.prisma.conversationParticipant.updateMany({
      where: {
        conversationId: conversation.id,
        externalParticipantId: conversation.externalParticipantId,
      },
      data: { externalParticipantId: participantId },
    });
  }
}
