import { WHATSAPP_TEMPLATE_NAME_PATTERN } from '../constants/template.constants';
import { buildHeaderComponent } from './template-header.util';

export type TemplateComponentInput = Record<string, unknown>;

export function normalizeTemplateName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '_');
}

export function assertValidTemplateName(name: string): void {
  const normalized = normalizeTemplateName(name);
  if (!WHATSAPP_TEMPLATE_NAME_PATTERN.test(normalized)) {
    throw new Error(
      'Template name must start with a letter and contain only lowercase letters, numbers, and underscores.',
    );
  }
}

export function extractBodyPreview(components: TemplateComponentInput[]): string {
  const body = components.find(
    (component) =>
      typeof component.type === 'string' &&
      component.type.toUpperCase() === 'BODY',
  );
  const text = body?.text;
  return typeof text === 'string' ? text.slice(0, 240) : '';
}

export function buildMetaTemplateComponents(
  components: TemplateComponentInput[],
): Record<string, unknown>[] {
  if (!Array.isArray(components) || components.length === 0) {
    throw new Error('At least one template component is required.');
  }

  const hasBody = components.some(
    (component) =>
      typeof component.type === 'string' &&
      component.type.toUpperCase() === 'BODY',
  );
  if (!hasBody) {
    throw new Error('Template must include a BODY component.');
  }

  return components.map((component) => normalizeComponent(component));
}

export function buildMetaCreatePayload(input: {
  name: string;
  language: string;
  category: string;
  components: TemplateComponentInput[];
  parameterFormat?: string;
}): Record<string, unknown> {
  assertValidTemplateName(input.name);

  return {
    name: normalizeTemplateName(input.name),
    language: input.language.trim(),
    category: input.category.trim().toUpperCase(),
    parameter_format: input.parameterFormat?.trim() || 'POSITIONAL',
    components: buildMetaTemplateComponents(input.components),
  };
}

function normalizeComponent(
  component: TemplateComponentInput,
): Record<string, unknown> {
  const type = readString(component.type)?.toUpperCase();
  if (!type) {
    throw new Error('Each template component must include a type.');
  }

  if (type === 'HEADER') {
    const format = readString(component.format)?.toUpperCase() ?? 'TEXT';
    if (format === 'TEXT') {
      return buildHeaderComponent({
        format: 'TEXT',
        text: readString(component.text) ?? undefined,
      });
    }
    const headerHandle = readHeaderHandle(component);
    return buildHeaderComponent({
      format: format as 'IMAGE' | 'VIDEO' | 'DOCUMENT',
      headerHandle,
    });
  }

  if (type === 'BODY') {
    const text = readString(component.text);
    if (!text) {
      throw new Error('BODY component requires text.');
    }
    return { type: 'BODY', text };
  }

  if (type === 'FOOTER') {
    const text = readString(component.text);
    if (!text) {
      throw new Error('FOOTER component requires text.');
    }
    return { type: 'FOOTER', text };
  }

  if (type === 'BUTTONS') {
    const buttons = component.buttons;
    if (!Array.isArray(buttons) || buttons.length === 0) {
      throw new Error('BUTTONS component requires at least one button.');
    }
    return { type: 'BUTTONS', buttons };
  }

  return component;
}

function readHeaderHandle(component: TemplateComponentInput): string | undefined {
  const example = component.example;
  if (example && typeof example === 'object' && !Array.isArray(example)) {
    const handles = (example as Record<string, unknown>).header_handle;
    if (Array.isArray(handles) && typeof handles[0] === 'string') {
      return handles[0];
    }
  }
  return readString(component.headerHandle) ?? undefined;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
