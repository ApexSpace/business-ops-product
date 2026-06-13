import type { WhatsAppTemplateFormValues } from "@/features/whatsapp-settings/schemas/whatsapp-template.schema";
import { formValuesToComponents } from "@/features/whatsapp-settings/utils/whatsapp-template-components.util";

export interface WhatsAppTemplatePreviewModel {
  header?: string;
  headerMediaLabel?: string;
  body: string;
  footer?: string;
  buttons: string[];
}

export function buildTemplatePreviewModel(
  values: WhatsAppTemplateFormValues,
): WhatsAppTemplatePreviewModel {
  const components = formValuesToComponents(values);
  const header = components.find(
    (component) => component.type?.toUpperCase() === "HEADER",
  );
  const body = components.find(
    (component) => component.type?.toUpperCase() === "BODY",
  );
  const footer = components.find(
    (component) => component.type?.toUpperCase() === "FOOTER",
  );
  const buttonsComponent = components.find(
    (component) => component.type?.toUpperCase() === "BUTTONS",
  );

  const headerFormat = header?.format?.toUpperCase();
  let headerMediaLabel: string | undefined;
  if (headerFormat && headerFormat !== "TEXT") {
    headerMediaLabel =
      values.headerType === "image"
        ? "Image header"
        : values.headerType === "video"
          ? "Video header"
          : values.headerType === "document"
            ? "Document header"
            : `${headerFormat} header`;
  }

  return {
    header: header?.text?.trim() || undefined,
    headerMediaLabel,
    body: body?.text?.trim() || "Your message preview will appear here.",
    footer: footer?.text?.trim() || undefined,
    buttons:
      buttonsComponent?.buttons
        ?.map((button) => String(button.text ?? "").trim())
        .filter(Boolean) ?? [],
  };
}

export function renderTemplatePreview(
  values: WhatsAppTemplateFormValues,
): WhatsAppTemplatePreviewModel {
  return buildTemplatePreviewModel(values);
}
