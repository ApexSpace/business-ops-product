import { ConversationChannel } from '@prisma/client';
import { NormalizedInboundMessage } from './meta-inbound.types';

type MetaMessagingEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    attachments?: unknown[];
  };
};

function buildExternalConversationId(
  channel: ConversationChannel,
  resourceId: string,
  participantId: string,
): string {
  return `${channel}:${resourceId}:${participantId}`;
}

function normalizeMessagingEvent(
  channel: ConversationChannel,
  providerKey: string,
  resourceId: string,
  event: MetaMessagingEvent,
): NormalizedInboundMessage | null {
  const senderId = event.sender?.id;
  const recipientId = event.recipient?.id;
  const mid = event.message?.mid;

  if (!senderId || !recipientId || !mid || !event.message) {
    return null;
  }

  const isEcho = senderId === resourceId;
  const participantId = isEcho ? recipientId : senderId;
  const externalPageId =
    channel === ConversationChannel.FACEBOOK ? resourceId : null;

  return {
    channel,
    providerKey,
    externalResourceId: resourceId,
    externalConversationId: buildExternalConversationId(
      channel,
      resourceId,
      participantId,
    ),
    externalParticipantId: participantId,
    externalPageId,
    externalMessageId: mid,
    externalSenderId: senderId,
    externalRecipientId: recipientId,
    text: event.message.text ?? null,
    attachments: event.message.attachments ?? null,
    timestamp: new Date((event.timestamp ?? Date.now()) * 1000),
    senderName: null,
    senderProfilePictureUrl: null,
    rawMetadata: { isEcho },
  };
}

export function normalizeMetaPageWebhook(entry: {
  id?: string;
  messaging?: MetaMessagingEvent[];
}): NormalizedInboundMessage[] {
  const resourceId = entry.id;
  if (!resourceId || !entry.messaging?.length) {
    return [];
  }

  const results: NormalizedInboundMessage[] = [];
  for (const event of entry.messaging) {
    const normalized = normalizeMessagingEvent(
      ConversationChannel.FACEBOOK,
      'facebook',
      resourceId,
      event,
    );
    if (normalized && !normalized.rawMetadata?.isEcho) {
      results.push(normalized);
    }
  }
  return results;
}

export function normalizeMetaInstagramWebhook(entry: {
  id?: string;
  messaging?: MetaMessagingEvent[];
}): NormalizedInboundMessage[] {
  const resourceId = entry.id;
  if (!resourceId || !entry.messaging?.length) {
    return [];
  }

  const results: NormalizedInboundMessage[] = [];
  for (const event of entry.messaging) {
    const normalized = normalizeMessagingEvent(
      ConversationChannel.INSTAGRAM,
      'instagram',
      resourceId,
      event,
    );
    if (normalized && !normalized.rawMetadata?.isEcho) {
      results.push(normalized);
    }
  }
  return results;
}

export function normalizeMetaWebhookPayload(body: Record<string, unknown>): {
  messages: NormalizedInboundMessage[];
  objectType: string | null;
} {
  const objectType = typeof body.object === 'string' ? body.object : null;
  const entries = Array.isArray(body.entry) ? body.entry : [];
  const messages: NormalizedInboundMessage[] = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as { id?: string; messaging?: MetaMessagingEvent[] };

    if (objectType === 'page') {
      messages.push(...normalizeMetaPageWebhook(record));
    } else if (objectType === 'instagram') {
      messages.push(...normalizeMetaInstagramWebhook(record));
    }
  }

  return { messages, objectType };
}
