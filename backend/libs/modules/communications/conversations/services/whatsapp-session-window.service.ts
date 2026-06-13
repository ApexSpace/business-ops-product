import { Injectable } from '@nestjs/common';
import { Contact, ConversationChannel } from '@prisma/client';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { ConversationMessagesRepository } from '../repositories/conversation-messages.repository';
import {
  isWhatsAppSessionOpen,
  requiresWhatsAppTemplate,
} from '../utils/conversation-window.util';

export interface WhatsAppSessionState {
  sessionOpen: boolean;
  requiresTemplate: boolean;
  lastInboundAt: Date | null;
}

@Injectable()
export class WhatsAppSessionWindowService {
  constructor(
    private readonly messagesRepository: ConversationMessagesRepository,
    private readonly contactRepository: ContactRepository,
  ) {}

  async getSessionStateForConversation(
    businessId: string,
    conversationId: string,
    now: Date = new Date(),
  ): Promise<WhatsAppSessionState> {
    const lastInbound =
      await this.messagesRepository.findLastInboundContactMessage(
        businessId,
        conversationId,
        ConversationChannel.WHATSAPP,
      );

    return this.toSessionState(lastInbound?.createdAt ?? null, now);
  }

  async getSessionStateForContact(
    businessId: string,
    contactId: string,
    now: Date = new Date(),
  ): Promise<WhatsAppSessionState> {
    const contact = await this.contactRepository.findById(businessId, contactId);
    if (!contact) {
      return this.toSessionState(null, now);
    }

    return this.getSessionStateForContactRecord(businessId, contact, now);
  }

  async getSessionStateForContactRecord(
    businessId: string,
    contact: Contact,
    now: Date = new Date(),
  ): Promise<WhatsAppSessionState> {
    const lastInbound =
      await this.messagesRepository.findLastInboundContactMessageForContact(
        businessId,
        contact,
        ConversationChannel.WHATSAPP,
      );

    return this.toSessionState(lastInbound?.createdAt ?? null, now);
  }

  toSessionState(
    lastInboundAt: Date | null,
    now: Date = new Date(),
  ): WhatsAppSessionState {
    return {
      sessionOpen: isWhatsAppSessionOpen(lastInboundAt, now),
      requiresTemplate: requiresWhatsAppTemplate(lastInboundAt, now),
      lastInboundAt,
    };
  }
}
