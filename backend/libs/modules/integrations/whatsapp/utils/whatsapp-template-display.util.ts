import type { SendWhatsAppTemplateDto } from '@app/modules/communications/conversations/dto/send-message.dto';

export function buildWhatsAppTemplateDisplayText(
  template: SendWhatsAppTemplateDto,
): string {
  const name = template.name.trim();
  const parameterTexts: string[] = [];

  for (const component of template.components ?? []) {
    if (!component || typeof component !== 'object' || Array.isArray(component)) {
      continue;
    }

    const record = component as Record<string, unknown>;
    if (String(record.type).toLowerCase() !== 'body') {
      continue;
    }

    if (!Array.isArray(record.parameters)) {
      continue;
    }

    for (const parameter of record.parameters) {
      if (!parameter || typeof parameter !== 'object' || Array.isArray(parameter)) {
        continue;
      }
      const text = (parameter as Record<string, unknown>).text;
      if (typeof text === 'string' && text.trim()) {
        parameterTexts.push(text.trim());
      }
    }
  }

  if (parameterTexts.length > 0) {
    return parameterTexts.join(' ');
  }

  return `Template: ${name}`;
}
