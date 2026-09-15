export interface WhatsAppTemplateStatusUpdate {
  wabaId: string;
  event: string;
  metaTemplateId: string | null;
  name: string;
  language: string;
  reason: string | null;
}

export function extractWhatsAppTemplateStatusUpdates(
  body: Record<string, unknown>,
): WhatsAppTemplateStatusUpdate[] {
  const entries = body.entry;
  if (!Array.isArray(entries)) {
    return [];
  }

  const updates: WhatsAppTemplateStatusUpdate[] = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const wabaId = readString((entry as Record<string, unknown>).id);
    const changes = (entry as Record<string, unknown>).changes;
    if (!wabaId || !Array.isArray(changes)) continue;

    for (const change of changes) {
      if (!change || typeof change !== 'object') continue;
      const record = change as Record<string, unknown>;
      if (record.field !== 'message_template_status_update') continue;

      const value = record.value;
      if (!value || typeof value !== 'object') continue;
      const payload = value as Record<string, unknown>;

      const name = readString(payload.message_template_name);
      const language = readString(payload.message_template_language);
      const event = readString(payload.event);
      if (!name || !language || !event) continue;

      updates.push({
        wabaId,
        event,
        metaTemplateId: readString(payload.message_template_id),
        name,
        language,
        reason: readString(payload.reason),
      });
    }
  }

  return updates;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
