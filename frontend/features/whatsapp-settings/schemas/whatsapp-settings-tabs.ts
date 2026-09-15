export const WHATSAPP_SETTINGS_TABS = [
  { value: "numbers", label: "Numbers" },
  { value: "templates", label: "Templates" },
  { value: "flows", label: "Flows" },
] as const;

export type WhatsAppSettingsTab =
  (typeof WHATSAPP_SETTINGS_TABS)[number]["value"];

export function parseWhatsAppSettingsTab(
  value: string | null,
): WhatsAppSettingsTab {
  if (value === "templates" || value === "flows") {
    return value;
  }
  return "numbers";
}
