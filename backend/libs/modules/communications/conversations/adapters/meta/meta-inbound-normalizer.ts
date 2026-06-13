import { ConversationChannel } from '@prisma/client';
import {
  normalizeMetaInboundAttachments,
  normalizeWhatsAppInboundAttachments,
} from './meta-attachment.util';
import { NormalizedInboundMessage } from './meta-inbound.types';

export { extractWhatsAppTemplateStatusUpdates } from '@app/modules/integrations/whatsapp/utils/template-webhook.util';
export type { WhatsAppTemplateStatusUpdate } from '@app/modules/integrations/whatsapp/utils/template-webhook.util';

const WHATSAPP_WEBHOOK_OBJECTS = new Set(['whatsapp', 'whatsapp_business_account']);

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
    attachments: normalizeMetaInboundAttachments(event.message.attachments),
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

type WhatsAppWebhookContact = {
  profile?: { name?: string };
  wa_id?: string;
};

type WhatsAppWebhookMessage = {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  image?: { id?: string; mime_type?: string; caption?: string };
  video?: { id?: string; mime_type?: string; caption?: string };
  audio?: { id?: string; mime_type?: string };
  document?: { id?: string; mime_type?: string; filename?: string; caption?: string };
  sticker?: { id?: string; mime_type?: string };
};

type WhatsAppChangeValue = {
  messaging_product?: string;
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: WhatsAppWebhookContact[];
  messages?: WhatsAppWebhookMessage[];
};

function resolveWhatsAppContactName(
  contacts: WhatsAppWebhookContact[] | undefined,
  waId: string,
): string | null {
  const match = contacts?.find((contact) => contact.wa_id === waId);
  return match?.profile?.name?.trim() || null;
}

function normalizeWhatsAppMessage(
  phoneNumberId: string,
  wabaId: string | null,
  value: WhatsAppChangeValue,
  message: WhatsAppWebhookMessage,
): NormalizedInboundMessage | null {
  const senderWaId = message.from?.trim();
  const messageId = message.id?.trim();

  if (!senderWaId || !messageId) {
    return null;
  }

  const text =
    message.type === 'text' ? (message.text?.body?.trim() ?? null) : null;
  const timestampSeconds = Number(message.timestamp);
  const timestamp = Number.isFinite(timestampSeconds)
    ? new Date(timestampSeconds * 1000)
    : new Date();

  return {
    channel: ConversationChannel.WHATSAPP,
    providerKey: 'whatsapp',
    externalResourceId: phoneNumberId,
    externalConversationId: buildExternalConversationId(
      ConversationChannel.WHATSAPP,
      phoneNumberId,
      senderWaId,
    ),
    externalParticipantId: senderWaId,
    externalPageId: null,
    externalMessageId: messageId,
    externalSenderId: senderWaId,
    externalRecipientId: phoneNumberId,
    text,
    attachments: normalizeWhatsAppInboundAttachments(message),
    timestamp,
    senderName: resolveWhatsAppContactName(value.contacts, senderWaId),
    senderProfilePictureUrl: null,
    rawMetadata: {
      wabaId,
      messageType: message.type ?? null,
      displayPhoneNumber: value.metadata?.display_phone_number ?? null,
    },
  };
}

export function normalizeMetaWhatsAppWebhook(
  entry: { id?: string; changes?: Array<{ value?: WhatsAppChangeValue; field?: string }> },
): NormalizedInboundMessage[] {
  const wabaId = entry.id ?? null;
  if (!entry.changes?.length) {
    return [];
  }

  const results: NormalizedInboundMessage[] = [];

  for (const change of entry.changes) {
    if (change.field !== 'messages') continue;

    const value = change.value;
    const phoneNumberId = value?.metadata?.phone_number_id?.trim();
    if (!value || !phoneNumberId || !value.messages?.length) {
      continue;
    }

    for (const message of value.messages) {
      const normalized = normalizeWhatsAppMessage(
        phoneNumberId,
        wabaId,
        value,
        message,
      );
      if (normalized) {
        results.push(normalized);
      }
    }
  }

  return results;
}

export function isWhatsAppWebhookObject(objectType: string | null): boolean {
  return objectType !== null && WHATSAPP_WEBHOOK_OBJECTS.has(objectType);
}

export type NormalizedWhatsAppDeliveryStatus = {
  externalMessageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  recipientId: string;
  errorMessage: string | null;
};

type WhatsAppStatusUpdate = {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: Array<{ code?: number; title?: string; message?: string }>;
};

function mapWhatsAppDeliveryStatus(
  status: WhatsAppStatusUpdate,
): NormalizedWhatsAppDeliveryStatus | null {
  const externalMessageId = status.id?.trim();
  const rawStatus = status.status?.trim().toLowerCase();
  if (!externalMessageId || !rawStatus) {
    return null;
  }

  if (
    rawStatus !== 'sent' &&
    rawStatus !== 'delivered' &&
    rawStatus !== 'read' &&
    rawStatus !== 'failed'
  ) {
    return null;
  }

  const timestampSeconds = Number(status.timestamp);
  const timestamp = Number.isFinite(timestampSeconds)
    ? new Date(timestampSeconds * 1000)
    : new Date();

  const errorMessage =
    rawStatus === 'failed'
      ? (status.errors
          ?.map((error) => error.message ?? error.title ?? `Code ${error.code}`)
          .filter(Boolean)
          .join('; ') ?? 'WhatsApp delivery failed')
      : null;

  return {
    externalMessageId,
    status: rawStatus,
    timestamp,
    recipientId: status.recipient_id?.trim() ?? '',
    errorMessage,
  };
}

export function extractWhatsAppDeliveryStatuses(
  body: Record<string, unknown>,
): NormalizedWhatsAppDeliveryStatus[] {
  const objectType = typeof body.object === 'string' ? body.object : null;
  if (!isWhatsAppWebhookObject(objectType)) {
    return [];
  }

  const entries = Array.isArray(body.entry) ? body.entry : [];
  const results: NormalizedWhatsAppDeliveryStatus[] = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const changes = (entry as { changes?: Array<{ field?: string; value?: WhatsAppChangeValue & { statuses?: WhatsAppStatusUpdate[] } }> })
      .changes;
    for (const change of changes ?? []) {
      if (change.field !== 'messages') continue;
      for (const status of change.value?.statuses ?? []) {
        const normalized = mapWhatsAppDeliveryStatus(status);
        if (normalized) {
          results.push(normalized);
        }
      }
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

    if (objectType === 'page') {
      const record = entry as { id?: string; messaging?: MetaMessagingEvent[] };
      messages.push(...normalizeMetaPageWebhook(record));
    } else if (objectType === 'instagram') {
      const record = entry as { id?: string; messaging?: MetaMessagingEvent[] };
      messages.push(...normalizeMetaInstagramWebhook(record));
    } else if (isWhatsAppWebhookObject(objectType)) {
      const record = entry as {
        id?: string;
        changes?: Array<{ value?: WhatsAppChangeValue; field?: string }>;
      };
      messages.push(...normalizeMetaWhatsAppWebhook(record));
    }
  }

  return { messages, objectType };
}
