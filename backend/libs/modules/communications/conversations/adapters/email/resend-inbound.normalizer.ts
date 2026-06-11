import { ConversationChannel } from '@prisma/client';
import { EMAIL_PROVIDER_KEY } from '@app/modules/communications/email/constants/email-platform.constants';
import { extractInboundEmailBody } from '@app/modules/communications/email/utils/email-reply-body.util';
import {
  normalizeRoutableEmailAddress,
  parseConversationReplyToAddress,
} from '@app/modules/communications/email/utils/email-reply-to.util';
import { NormalizedInboundMessage } from '../meta/meta-inbound.types';

export type ResendInboundEmailPayload = {
  email_id?: string;
  from?: string;
  to?: string[];
  subject?: string;
  text?: string;
  html?: string;
  message_id?: string;
  headers?: Record<string, string | string[]>;
};

function extractEmailAddress(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/<([^>]+)>/);
  return (match?.[1] ?? trimmed).trim().toLowerCase();
}

function extractDisplayName(value: string): string | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^(.+?)\s*<[^>]+>$/);
  return match?.[1]?.trim() || null;
}

function pickRoutingAddress(
  to: string[] | undefined,
  inboundDomain: string,
): string | null {
  if (!Array.isArray(to) || to.length === 0) {
    return null;
  }

  for (const entry of to) {
    const normalized = normalizeRoutableEmailAddress(entry, inboundDomain);
    if (parseConversationReplyToAddress(normalized)) {
      return normalized;
    }
  }

  return normalizeRoutableEmailAddress(to[0] ?? '', inboundDomain) || null;
}

export function normalizeResendInboundEmail(
  payload: ResendInboundEmailPayload,
  inboundDomain: string,
): NormalizedInboundMessage | null {
  const routingAddress = pickRoutingAddress(payload.to, inboundDomain);
  if (!routingAddress) {
    return null;
  }

  const routing = parseConversationReplyToAddress(routingAddress);
  if (!routing) {
    return null;
  }

  const fromRaw = payload.from?.trim();
  if (!fromRaw) {
    return null;
  }

  const externalMessageId =
    payload.email_id?.trim() ||
    payload.message_id?.trim() ||
    `resend-inbound-${Date.now()}`;

  const senderEmail = extractEmailAddress(fromRaw);
  const senderName = extractDisplayName(fromRaw);

  return {
    channel: ConversationChannel.EMAIL,
    providerKey: EMAIL_PROVIDER_KEY,
    externalResourceId: routing.tenantId,
    externalConversationId: routing.conversationId,
    externalParticipantId: senderEmail,
    externalPageId: null,
    externalMessageId,
    externalSenderId: senderEmail,
    externalRecipientId: routingAddress,
    text: extractInboundEmailBody(payload.text, payload.html),
    attachments: null,
    timestamp: new Date(),
    senderName,
    senderProfilePictureUrl: null,
    rawMetadata: {
      subject: payload.subject ?? null,
      html: payload.html ?? null,
      headers: payload.headers ?? null,
      routingAddress,
    },
  };
}
