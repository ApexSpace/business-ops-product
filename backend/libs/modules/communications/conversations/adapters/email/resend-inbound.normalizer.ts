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

function headerValues(
  headers: Record<string, string | string[]> | undefined,
  ...keys: string[]
): string[] {
  if (!headers) {
    return [];
  }

  const values: string[] = [];
  for (const key of keys) {
    const direct = headers[key];
    const lower = headers[key.toLowerCase()];
    for (const candidate of [direct, lower]) {
      if (typeof candidate === 'string' && candidate.trim()) {
        values.push(candidate);
      } else if (Array.isArray(candidate)) {
        values.push(...candidate.filter((entry) => entry.trim()));
      }
    }
  }

  return values;
}

function collectRecipientCandidates(
  payload: ResendInboundEmailPayload,
): string[] {
  const candidates: string[] = [];
  if (Array.isArray(payload.to)) {
    candidates.push(...payload.to);
  }

  candidates.push(
    ...headerValues(
      payload.headers,
      'to',
      'delivered-to',
      'x-original-to',
      'envelope-to',
    ),
  );

  return candidates;
}

function pickRoutingAddress(
  candidates: string[],
  inboundDomain: string,
): string | null {
  if (candidates.length === 0) {
    return null;
  }

  for (const entry of candidates) {
    const normalized = normalizeRoutableEmailAddress(entry, inboundDomain);
    if (parseConversationReplyToAddress(normalized)) {
      return normalized;
    }
  }

  return (
    normalizeRoutableEmailAddress(candidates[0] ?? '', inboundDomain) || null
  );
}

export function normalizeResendInboundEmail(
  payload: ResendInboundEmailPayload,
  inboundDomain: string,
): NormalizedInboundMessage | null {
  const routingAddress = pickRoutingAddress(
    collectRecipientCandidates(payload),
    inboundDomain,
  );
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
