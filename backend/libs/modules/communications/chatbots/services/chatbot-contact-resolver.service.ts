import { Injectable } from '@nestjs/common';
import { Contact, Prisma } from '@prisma/client';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { normalizePhoneKey } from '@app/modules/crm/contacts/utils/contact-profile.util';

export interface ChatbotContactInput {
  visitorId: string;
  visitorName?: string;
  visitorEmail?: string;
  visitorPhone?: string;
  chatbotId: string;
  pageUrl?: string;
}

@Injectable()
export class ChatbotContactResolverService {
  constructor(private readonly contactRepository: ContactRepository) {}

  async resolveOrCreate(
    businessId: string,
    input: ChatbotContactInput,
  ): Promise<Contact | null> {
    if (!input.visitorName && !input.visitorEmail && !input.visitorPhone) {
      return null;
    }

    const email = input.visitorEmail?.trim().toLowerCase() || null;
    const phoneRaw = input.visitorPhone?.trim() || null;
    const phoneKey = phoneRaw ? normalizePhoneKey(undefined, phoneRaw) : null;

    let contact: Contact | null = null;

    if (email) {
      contact = await this.contactRepository.findByEmail(businessId, email);
    }
    if (!contact && phoneKey) {
      contact = await this.contactRepository.findByPhoneKey(businessId, phoneKey);
    }
    if (!contact) {
      contact = await this.contactRepository.findByChatbotVisitorId(
        businessId,
        input.visitorId,
      );
    }

    if (contact) {
      await this.contactRepository.update(businessId, contact.id, {
        metadata: this.mergeMetadata(contact.metadata, input),
        ...(input.visitorName && !contact.displayName
          ? { displayName: input.visitorName.trim() }
          : {}),
      });
      await this.contactRepository.touchUpdatedAt(businessId, contact.id);
      return contact;
    }

    const name = input.visitorName?.trim() || 'Website Visitor';
    const nameParts = name.split(/\s+/);
    const firstName = nameParts[0] ?? name;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

    return this.contactRepository.createPublic(businessId, {
      firstName,
      lastName,
      displayName: name,
      email,
      phoneNumber: phoneRaw,
      source: 'Website Chatbot',
      metadata: {
        source: 'Website Chatbot',
        chatbotId: input.chatbotId,
        visitorId: input.visitorId,
        lastPageUrl: input.pageUrl ?? null,
        firstSeenAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    });
  }

  private mergeMetadata(
    existing: Prisma.JsonValue | null,
    input: ChatbotContactInput,
  ): Prisma.InputJsonValue {
    const base =
      existing && typeof existing === 'object' && !Array.isArray(existing)
        ? (existing as Record<string, unknown>)
        : {};
    return {
      ...base,
      source: 'Website Chatbot',
      chatbotId: input.chatbotId,
      visitorId: input.visitorId,
      lastPageUrl: input.pageUrl ?? base.lastPageUrl,
    } as Prisma.InputJsonValue;
  }
}
