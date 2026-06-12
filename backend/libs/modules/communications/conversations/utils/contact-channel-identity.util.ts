import { ConversationChannel } from '@prisma/client';
import {
  normalizePhoneKey,
  sanitizePhoneFields,
} from '@app/modules/crm/contacts/utils/contact-profile.util';
import { NormalizedInboundMessage } from '../adapters/meta/meta-inbound.types';

export type ChannelMetadataKey =
  | 'facebookPsid'
  | 'instagramUserId'
  | 'whatsappWaId'
  | 'emailAddress';

export interface SenderProfileSnapshot {
  name?: string;
  profilePic?: string;
  email?: string;
}

export interface InboundContactIdentity {
  email: string | null;
  phoneKey: string | null;
  phoneFields: { phoneCountryCode: string | null; phoneNumber: string | null };
}

export function resolveChannelMetadataKey(
  channel: ConversationChannel,
): ChannelMetadataKey {
  if (channel === ConversationChannel.FACEBOOK) return 'facebookPsid';
  if (channel === ConversationChannel.WHATSAPP) return 'whatsappWaId';
  if (channel === ConversationChannel.EMAIL) return 'emailAddress';
  return 'instagramUserId';
}

export function normalizeContactEmail(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed || null;
}

export function parseWhatsAppWaIdToPhone(waId: string): {
  phoneKey: string | null;
  phoneFields: { phoneCountryCode: string | null; phoneNumber: string | null };
} {
  const digits = waId.replace(/\D/g, '');
  if (!digits) {
    return { phoneKey: null, phoneFields: { phoneCountryCode: null, phoneNumber: null } };
  }

  const phoneFields = sanitizePhoneFields('+', digits);
  const phoneKey = normalizePhoneKey(phoneFields.phoneCountryCode, phoneFields.phoneNumber);

  return { phoneKey, phoneFields };
}

export function buildInboundContactIdentity(
  inbound: NormalizedInboundMessage,
  profile: SenderProfileSnapshot,
): InboundContactIdentity {
  let email: string | null = null;
  let phoneKey: string | null = null;
  let phoneFields: {
    phoneCountryCode: string | null;
    phoneNumber: string | null;
  } = { phoneCountryCode: null, phoneNumber: null };

  if (inbound.channel === ConversationChannel.EMAIL) {
    email = normalizeContactEmail(inbound.externalParticipantId);
  } else if (inbound.channel === ConversationChannel.FACEBOOK) {
    email = normalizeContactEmail(profile.email);
  }

  if (inbound.channel === ConversationChannel.WHATSAPP) {
    const parsed = parseWhatsAppWaIdToPhone(inbound.externalParticipantId);
    phoneKey = parsed.phoneKey;
    phoneFields = parsed.phoneFields;
  }

  return { email, phoneKey, phoneFields };
}

export function defaultInboundDisplayName(
  channel: ConversationChannel,
  externalParticipantId: string,
): string {
  if (channel === ConversationChannel.FACEBOOK) return 'Facebook User';
  if (channel === ConversationChannel.WHATSAPP) {
    return externalParticipantId.startsWith('+')
      ? externalParticipantId
      : `+${externalParticipantId}`;
  }
  if (channel === ConversationChannel.EMAIL) {
    return externalParticipantId;
  }
  return 'Instagram User';
}

export function contactSourceLabel(channel: ConversationChannel): string {
  if (channel === ConversationChannel.FACEBOOK) return 'Facebook Messenger';
  if (channel === ConversationChannel.WHATSAPP) return 'WhatsApp';
  if (channel === ConversationChannel.EMAIL) return 'Email';
  return 'Instagram';
}
