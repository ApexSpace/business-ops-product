import { ConversationChannel } from '@prisma/client';
import { normalizeE164Phone } from '@app/core/config/twilio/twilio.config';
import { SMS_PROVIDER_KEY } from '@app/modules/communications/sms/constants/sms-platform.constants';
import { NormalizedInboundMessage } from '../../conversations/adapters/meta/meta-inbound.types';

export interface TwilioInboundSmsPayload {
  MessageSid?: string;
  AccountSid?: string;
  From?: string;
  To?: string;
  Body?: string;
  NumMedia?: string;
  [key: string]: string | undefined;
}

export function normalizeTwilioInboundSms(
  payload: TwilioInboundSmsPayload,
): NormalizedInboundMessage | null {
  const messageSid = payload.MessageSid?.trim();
  const from = payload.From?.trim();
  const to = payload.To?.trim();
  if (!messageSid || !from || !to) {
    return null;
  }

  const numMedia = Number.parseInt(payload.NumMedia ?? '0', 10) || 0;
  const attachments =
    numMedia > 0
      ? Array.from({ length: numMedia }, (_, index) => {
          const url = payload[`MediaUrl${index}`];
          const contentType = payload[`MediaContentType${index}`] ?? 'image/jpeg';
          if (!url) return null;
          return { type: contentType, url, title: null };
        }).filter((row): row is { type: string; url: string; title: null } => row !== null)
      : null;

  const fromE164 = normalizeE164Phone(from);
  const toE164 = normalizeE164Phone(to);

  return {
    channel: ConversationChannel.SMS,
    providerKey: SMS_PROVIDER_KEY,
    externalResourceId: toE164,
    externalConversationId: `${toE164}:${fromE164}`,
    externalParticipantId: fromE164,
    externalPageId: null,
    externalMessageId: messageSid,
    externalSenderId: fromE164,
    externalRecipientId: toE164,
    text: payload.Body?.trim() || null,
    attachments,
    timestamp: new Date(),
    senderName: fromE164,
    senderProfilePictureUrl: null,
    rawMetadata: payload as Record<string, unknown>,
  };
}
