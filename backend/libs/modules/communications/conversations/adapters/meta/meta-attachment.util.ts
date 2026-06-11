export interface MetaNormalizedAttachment {
  type: string;
  url: string | null;
  title: string | null;
}

export interface MetaOutboundAttachment {
  type: 'image' | 'file' | 'video' | 'audio';
  url: string;
}

type MetaWebhookAttachment = {
  type?: string;
  payload?: {
    url?: string;
    title?: string;
    sticker_id?: number;
  };
};

const SUPPORTED_OUTBOUND_TYPES = new Set([
  'image',
  'file',
  'video',
  'audio',
]);

type WhatsAppMediaPayload = {
  id?: string;
  mime_type?: string;
  caption?: string;
  filename?: string;
};

type WhatsAppInboundMessage = {
  type?: string;
  image?: WhatsAppMediaPayload;
  video?: WhatsAppMediaPayload;
  audio?: WhatsAppMediaPayload;
  document?: WhatsAppMediaPayload;
  sticker?: WhatsAppMediaPayload;
};

export function normalizeWhatsAppInboundAttachments(
  message: WhatsAppInboundMessage,
): MetaNormalizedAttachment[] | null {
  const type = message.type?.trim();
  if (!type || type === 'text') {
    return null;
  }

  const media =
    message.image ??
    message.video ??
    message.audio ??
    message.document ??
    message.sticker;

  if (!media?.id) {
    return [{ type, url: null, title: null }];
  }

  return [
    {
      type,
      url: null,
      title: media.caption?.trim() || media.filename?.trim() || media.id,
    },
  ];
}

export function normalizeMetaInboundAttachments(
  raw: unknown[] | null | undefined,
): MetaNormalizedAttachment[] | null {
  if (!raw?.length) {
    return null;
  }

  const normalized: MetaNormalizedAttachment[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const attachment = item as MetaWebhookAttachment;
    normalized.push({
      type: attachment.type?.trim() || 'attachment',
      url: attachment.payload?.url?.trim() || null,
      title: attachment.payload?.title?.trim() || null,
    });
  }

  return normalized.length > 0 ? normalized : null;
}

export function toMetaOutboundAttachments(
  raw: unknown[] | null | undefined,
): MetaOutboundAttachment[] {
  if (!raw?.length) {
    return [];
  }

  const attachments: MetaOutboundAttachment[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const type = typeof record.type === 'string' ? record.type.trim() : '';
    const url = typeof record.url === 'string' ? record.url.trim() : '';
    if (!url || !SUPPORTED_OUTBOUND_TYPES.has(type)) continue;
    attachments.push({
      type: type as MetaOutboundAttachment['type'],
      url,
    });
  }

  return attachments;
}

export function previewFromMessageContent(
  text: string | null | undefined,
  attachments: Array<{ type: string }> | null | undefined,
): string {
  if (text?.trim()) {
    return text.trim().slice(0, 500);
  }

  const first = attachments?.[0];
  if (first) {
    const label = first.type.charAt(0).toUpperCase() + first.type.slice(1);
    return `[${label}]`;
  }

  return '[Attachment]';
}
