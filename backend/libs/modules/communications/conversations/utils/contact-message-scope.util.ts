import { Contact, ConversationChannel, Prisma } from '@prisma/client';
import { resolveWhatsAppParticipantId } from './contact-outbound-identity.util';

function readMetadataString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Merged timeline scope: messages on conversations linked to this contact,
 * plus conversations that match the contact's channel identities (email, phone, etc.)
 * even when conversation.contactId was not yet reassigned.
 */
export function buildContactMessageScopeWhere(
  businessId: string,
  contact: Contact,
): Prisma.ConversationMessageWhereInput {
  const conversationFilters: Prisma.ConversationWhereInput[] = [
    { contactId: contact.id, deletedAt: null },
  ];

  const email = contact.email?.trim().toLowerCase();
  if (email) {
    conversationFilters.push({
      channel: ConversationChannel.EMAIL,
      externalParticipantId: email,
      deletedAt: null,
    });
  }

  const waId = resolveWhatsAppParticipantId(contact);
  if (waId) {
    conversationFilters.push({
      channel: ConversationChannel.WHATSAPP,
      externalParticipantId: waId,
      deletedAt: null,
    });
  }

  const facebookPsid = readMetadataString(contact.metadata, 'facebookPsid');
  if (facebookPsid) {
    conversationFilters.push({
      channel: ConversationChannel.FACEBOOK,
      externalParticipantId: facebookPsid,
      deletedAt: null,
    });
  }

  const instagramUserId = readMetadataString(contact.metadata, 'instagramUserId');
  if (instagramUserId) {
    conversationFilters.push({
      channel: ConversationChannel.INSTAGRAM,
      externalParticipantId: instagramUserId,
      deletedAt: null,
    });
  }

  return {
    businessId,
    OR: [
      { conversation: { businessId, OR: conversationFilters } },
      { contactId: contact.id },
    ],
  };
}
