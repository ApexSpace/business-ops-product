import type { WhatsAppTemplateComponent } from "@/features/whatsapp-settings/api/whatsapp-templates.api";

export interface TemplateVariableField {
  key: string;
  label: string;
  componentType: "header" | "body";
  index: number;
}

export interface TemplateHeaderMediaRequirement {
  type: "image" | "video" | "document";
  label: string;
}

const VARIABLE_PATTERN = /\{\{(\d+)\}\}/g;

function readComponentType(component: WhatsAppTemplateComponent | undefined) {
  return component?.type?.toUpperCase() ?? "";
}

function extractIndexes(text: string): number[] {
  const indexes = new Set<number>();
  for (const match of text.matchAll(VARIABLE_PATTERN)) {
    const index = Number(match[1]);
    if (Number.isFinite(index) && index > 0) {
      indexes.add(index);
    }
  }
  return [...indexes].sort((a, b) => a - b);
}

export function extractTemplateVariableFields(
  components: WhatsAppTemplateComponent[],
): TemplateVariableField[] {
  const fields: TemplateVariableField[] = [];

  for (const component of components) {
    const type = readComponentType(component);
    if (type !== "HEADER" && type !== "BODY") continue;
    const text = typeof component.text === "string" ? component.text : "";
    const componentType = type === "HEADER" ? "header" : "body";

    for (const index of extractIndexes(text)) {
      fields.push({
        key: `${componentType}-${index}`,
        label: `${type === "HEADER" ? "Header" : "Body"} variable {{${index}}}`,
        componentType,
        index,
      });
    }
  }

  return fields;
}

export function getTemplateHeaderMediaRequirement(
  components: WhatsAppTemplateComponent[],
): TemplateHeaderMediaRequirement | null {
  const header = components.find(
    (component) => readComponentType(component) === "HEADER",
  );
  const format = header?.format?.toUpperCase();
  if (format === "IMAGE") {
    return { type: "image", label: "Header image URL" };
  }
  if (format === "VIDEO") {
    return { type: "video", label: "Header video URL" };
  }
  if (format === "DOCUMENT") {
    return { type: "document", label: "Header document URL" };
  }
  return null;
}

function buildParameters(
  indexes: number[],
  values: Record<string, string>,
  componentType: "header" | "body",
) {
  return indexes.map((index) => ({
    type: "text",
    text: values[`${componentType}-${index}`]?.trim() ?? "",
  }));
}

export function buildTemplateSendComponents(
  components: WhatsAppTemplateComponent[],
  values: Record<string, string>,
): unknown[] {
  const sendComponents: unknown[] = [];
  const header = components.find(
    (component) => readComponentType(component) === "HEADER",
  );
  const body = components.find(
    (component) => readComponentType(component) === "BODY",
  );

  if (header?.format?.toUpperCase() === "TEXT") {
    const indexes = extractIndexes(header.text ?? "");
    if (indexes.length > 0) {
      sendComponents.push({
        type: "header",
        parameters: buildParameters(indexes, values, "header"),
      });
    }
  }

  const bodyIndexes = extractIndexes(body?.text ?? "");
  if (bodyIndexes.length > 0) {
    sendComponents.push({
      type: "body",
      parameters: buildParameters(bodyIndexes, values, "body"),
    });
  }

  return sendComponents;
}

export function isTemplateSendReady(input: {
  components: WhatsAppTemplateComponent[];
  values: Record<string, string>;
  headerMediaUrl?: string;
}): boolean {
  const fields = extractTemplateVariableFields(input.components);
  const headerMedia = getTemplateHeaderMediaRequirement(input.components);

  if (fields.length === 0 && !headerMedia) {
    return true;
  }

  const hasAllVariables = fields.every((field) =>
    Boolean(input.values[field.key]?.trim()),
  );
  if (!hasAllVariables) return false;

  if (headerMedia && !input.headerMediaUrl?.trim()) {
    return false;
  }

  return true;
}

export function renderTemplatePreviewText(
  components: WhatsAppTemplateComponent[],
  values: Record<string, string>,
  templateName?: string,
): string {
  const body = components.find(
    (component) => readComponentType(component) === "BODY",
  );
  const bodyText = typeof body?.text === "string" ? body.text : "";
  if (!bodyText.trim()) {
    return templateName ? `Template: ${templateName}` : "Template message";
  }

  let rendered = bodyText;
  for (const field of extractTemplateVariableFields(components)) {
    if (field.componentType !== "body") continue;
    const value = values[field.key]?.trim() ?? "";
    rendered = rendered.replace(
      new RegExp(`\\{\\{${field.index}\\}\\}`, "g"),
      value || `{{${field.index}}}`,
    );
  }

  return rendered.trim() || (templateName ? `Template: ${templateName}` : "Template message");
}

export const WHATSAPP_SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

export function deriveWhatsAppSessionFromMessages(
  messages: Array<{
    channel: string;
    direction: string;
    senderType: string;
    createdAt: string;
  }>,
  now: Date = new Date(),
): { sessionOpen: boolean; requiresTemplate: boolean } {
  const lastInbound = [...messages]
    .reverse()
    .find(
      (message) =>
        message.channel === "WHATSAPP" &&
        message.direction === "INBOUND" &&
        message.senderType === "CONTACT",
    );

  if (!lastInbound) {
    return { sessionOpen: false, requiresTemplate: true };
  }

  const elapsed = now.getTime() - new Date(lastInbound.createdAt).getTime();
  const sessionOpen =
    elapsed >= 0 && elapsed < WHATSAPP_SESSION_WINDOW_MS;

  return {
    sessionOpen,
    requiresTemplate: !sessionOpen,
  };
}
