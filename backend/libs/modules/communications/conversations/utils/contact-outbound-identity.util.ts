import { Contact, ConversationChannel } from '@prisma/client';
import { normalizeE164Phone } from '@app/core/config/twilio/twilio.config';
import { sanitizePhoneFields } from '@app/modules/crm/contacts/utils/contact-profile.util';
import { resolveChannelMetadataKey } from './contact-channel-identity.util';

function readMetadataString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Meta expects international digits without "+" (e.g. 923014863718). */
export function normalizeWhatsAppWaIdDigits(
  rawDigits: string,
  phoneCountryCode?: string | null,
): string {
  const cleaned = rawDigits.replace(/\D/g, '');
  if (!cleaned) {
    return cleaned;
  }

  const countryDigits = (phoneCountryCode?.trim() ?? '').replace(/\D/g, '');
  if (!countryDigits) {
    return cleaned;
  }

  if (cleaned.startsWith(countryDigits)) {
    return cleaned;
  }

  if (cleaned.startsWith('0')) {
    return countryDigits + cleaned.slice(1);
  }

  // Meta wa_ids are international digits; skip re-prefixing when already long enough.
  if (cleaned.length > 10) {
    return cleaned;
  }

  return countryDigits + cleaned;
}

function contactPhoneDigits(contact: Contact): string | null {
  const countryDigits = (contact.phoneCountryCode ?? '').replace(/\D/g, '');
  let national = (contact.phoneNumber ?? '').replace(/\D/g, '');
  if (!national) {
    return null;
  }

  if (national.startsWith('0') && countryDigits) {
    national = national.slice(1);
  }

  if (countryDigits) {
    return countryDigits + national;
  }

  return national.length >= 10 ? national : null;
}

export function resolveWhatsAppParticipantId(contact: Contact): string | null {
  const fromPhone = contactPhoneDigits(contact);
  const waId = readMetadataString(contact.metadata, 'whatsappWaId');
  if (waId) {
    const normalized = normalizeWhatsAppWaIdDigits(
      waId,
      contact.phoneCountryCode,
    );
    return normalized || fromPhone;
  }
  return fromPhone;
}

export function resolveSmsParticipantId(contact: Contact): string | null {
  const metadataKey = resolveChannelMetadataKey(ConversationChannel.SMS);
  const fromMeta = readMetadataString(contact.metadata, metadataKey);
  if (fromMeta) {
    const normalized = normalizeE164Phone(fromMeta);
    return normalized || null;
  }

  const { phoneCountryCode, phoneNumber } = sanitizePhoneFields(
    contact.phoneCountryCode,
    contact.phoneNumber,
  );
  if (!phoneNumber) {
    return null;
  }

  const dialDigits = (phoneCountryCode ?? '').replace(/\D/g, '');
  if (!dialDigits) {
    return normalizeE164Phone(phoneNumber) || null;
  }

  return normalizeE164Phone(`+${dialDigits}${phoneNumber}`) || null;
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
