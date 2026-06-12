import { Contact, ConversationChannel } from '@prisma/client';
import { resolveChannelMetadataKey } from './contact-channel-identity.util';

function readMetadataString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function contactPhoneDigits(contact: Contact): string | null {
  const numberDigits = contact.phoneNumber?.replace(/\D/g, '') ?? '';
  if (numberDigits.length >= 10) {
    return numberDigits;
  }

  const combined = `${contact.phoneCountryCode ?? ''}${contact.phoneNumber ?? ''}`.replace(
    /\D/g,
    '',
  );
  return combined || null;
}

export function resolveWhatsAppParticipantId(contact: Contact): string | null {
  const waId = readMetadataString(contact.metadata, 'whatsappWaId');
  if (waId) {
    const digits = waId.replace(/\D/g, '');
    return digits || null;
  }
  return contactPhoneDigits(contact);
}

export function resolveMetaParticipantId(
  contact: Contact,
  channel: ConversationChannel,
): string | null {
  if (channel === ConversationChannel.WHATSAPP) {
    return resolveWhatsAppParticipantId(contact);
  }

  const metadataKey = resolveChannelMetadataKey(channel);
  return readMetadataString(contact.metadata, metadataKey);
}
