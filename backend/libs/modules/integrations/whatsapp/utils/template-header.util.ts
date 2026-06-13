import type { WhatsAppTemplateHeaderFormat } from '../constants/template.constants';

export function buildHeaderComponent(input: {
  format: WhatsAppTemplateHeaderFormat;
  text?: string;
  headerHandle?: string;
}): Record<string, unknown> {
  const format = input.format.toUpperCase();

  if (format === 'TEXT') {
    const text = input.text?.trim();
    if (!text) {
      throw new Error('Header text is required for TEXT headers.');
    }
    return { type: 'HEADER', format: 'TEXT', text };
  }

  if (!input.headerHandle?.trim()) {
    throw new Error(`Header media handle is required for ${format} headers.`);
  }

  return {
    type: 'HEADER',
    format,
    example: {
      header_handle: [input.headerHandle.trim()],
    },
  };
}
