export interface ConversationMessageAttachment {
  type: string;
  url?: string | null;
  title?: string | null;
}

export function parseMessageAttachments(
  value: unknown,
): ConversationMessageAttachment[] {
  if (!Array.isArray(value)) return [];

  const attachments: ConversationMessageAttachment[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    attachments.push({
      type: typeof record.type === "string" ? record.type : "attachment",
      url: typeof record.url === "string" ? record.url : null,
      title: typeof record.title === "string" ? record.title : null,
    });
  }

  return attachments;
}

export function isImageAttachment(attachment: ConversationMessageAttachment): boolean {
  return attachment.type === "image" && Boolean(attachment.url);
}
