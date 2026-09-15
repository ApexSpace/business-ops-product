import type { WhatsAppTemplateComponent } from "@/features/whatsapp-settings/api/whatsapp-templates.api";
import type { WhatsAppTemplateFormValues } from "@/features/whatsapp-settings/schemas/whatsapp-template.schema";

function readComponentText(component: WhatsAppTemplateComponent | undefined) {
  return typeof component?.text === "string" ? component.text : "";
}

export function componentsToFormValues(
  components: WhatsAppTemplateComponent[],
  base: Partial<WhatsAppTemplateFormValues> = {},
): WhatsAppTemplateFormValues {
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
  let headerType: WhatsAppTemplateFormValues["headerType"] = "none";
  if (headerFormat === "TEXT") headerType = "text";
  else if (headerFormat === "IMAGE") headerType = "image";
  else if (headerFormat === "VIDEO") headerType = "video";
  else if (headerFormat === "DOCUMENT") headerType = "document";

  return {
    name: base.name ?? "",
    language: base.language ?? "en_US",
    category: base.category ?? "UTILITY",
    headerType,
    headerText: readComponentText(header),
    bodyText: readComponentText(body),
    footerText: readComponentText(footer),
    buttons:
      buttonsComponent?.buttons?.map((button) => ({
        type: String(button.type ?? "QUICK_REPLY") as WhatsAppTemplateFormValues["buttons"][number]["type"],
        text: String(button.text ?? ""),
        url: typeof button.url === "string" ? button.url : "",
        phone_number:
          typeof button.phone_number === "string" ? button.phone_number : "",
      })) ?? [],
  };
}

export function formValuesToComponents(
  values: WhatsAppTemplateFormValues,
): WhatsAppTemplateComponent[] {
  const components: WhatsAppTemplateComponent[] = [];

  if (values.headerType === "text" && values.headerText?.trim()) {
    components.push({
      type: "HEADER",
      format: "TEXT",
      text: values.headerText.trim(),
    });
  }

  components.push({
    type: "BODY",
    text: values.bodyText.trim(),
  });

  if (values.footerText?.trim()) {
    components.push({
      type: "FOOTER",
      text: values.footerText.trim(),
    });
  }

  if (values.buttons.length > 0) {
    components.push({
      type: "BUTTONS",
      buttons: values.buttons.map((button) => {
        const payload: Record<string, unknown> = {
          type: button.type,
          text: button.text.trim(),
        };
        if (button.type === "URL" && button.url?.trim()) {
          payload.url = button.url.trim();
        }
        if (button.type === "PHONE_NUMBER" && button.phone_number?.trim()) {
          payload.phone_number = button.phone_number.trim();
        }
        return payload;
      }),
    });
  }

  return components;
}

export function normalizeTemplateNameInput(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "_");
}

export function duplicateTemplateName(name: string): string {
  const base = name.replace(/_copy(?:_\d+)?$/, "");
  return `${base}_copy_${Date.now()}`;
}
