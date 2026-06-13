export interface WhatsAppTemplateSendInput {
  name: string;
  language: string;
  components?: unknown[];
  headerMedia?: { type: string; url: string };
}

export function buildWhatsAppTemplateSendPayload(
  input: WhatsAppTemplateSendInput,
): {
  name: string;
  language: { code: string };
  components: unknown[];
} {
  const components = Array.isArray(input.components)
    ? [...input.components]
    : [];

  if (input.headerMedia?.url?.trim()) {
    const mediaType = input.headerMedia.type.trim().toLowerCase();
    const url = input.headerMedia.url.trim();
    const parameter =
      mediaType === 'video'
        ? { type: 'video', video: { link: url } }
        : mediaType === 'document'
          ? { type: 'document', document: { link: url } }
          : { type: 'image', image: { link: url } };

    const existingHeaderIndex = components.findIndex(
      (component) =>
        component &&
        typeof component === 'object' &&
        String((component as Record<string, unknown>).type).toLowerCase() ===
          'header',
    );

    const headerComponent = {
      type: 'header',
      parameters: [parameter],
    };

    if (existingHeaderIndex >= 0) {
      components[existingHeaderIndex] = headerComponent;
    } else {
      components.unshift(headerComponent);
    }
  }

  return {
    name: input.name.trim(),
    language: { code: input.language.trim() },
    components,
  };
}
