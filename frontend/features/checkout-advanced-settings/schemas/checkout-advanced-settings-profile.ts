import type { CheckoutAdvancedSettings } from "@/features/checkout-advanced-settings/api/checkout-advanced-settings.api";

export const DEFAULT_TIP_PERCENTS = [18, 20, 22];

export function formatCustomPaymentMethodsSummary(
  names: string[],
): string {
  if (names.length === 0) return "None configured";
  return names.join(", ");
}

export function formatTipButtonsSummary(settings: CheckoutAdvancedSettings): string {
  if (settings.hideTipButtons) return "Tip buttons hidden";
  const percents = settings.tipButtonPercents.length
    ? settings.tipButtonPercents
    : DEFAULT_TIP_PERCENTS;
  return `${percents.join("%, ")}% presets`;
}

export function formatTipOptionsSummary(settings: CheckoutAdvancedSettings): string {
  const parts: string[] = [];
  parts.push(settings.askClientsForTip ? "Ask for tip" : "Do not ask for tip");
  if (settings.askForTipProductsOnly) {
    parts.push("products only");
  }
  return parts.join(" · ");
}

export function formatStaffRequirementsSummary(
  settings: CheckoutAdvancedSettings,
): string {
  const labels: string[] = [];
  if (settings.requireStaffForServices) labels.push("Services");
  if (settings.requireStaffForProducts) labels.push("Products");
  if (settings.requireStaffForGiftCards) labels.push("Gift cards");
  if (settings.requireStaffForPackages) labels.push("Packages");
  return labels.length > 0 ? labels.join(", ") : "None required";
}

export function formatReceiptSettingsSummary(
  settings: CheckoutAdvancedSettings,
): string {
  const parts: string[] = [];
  parts.push(
    settings.showServiceProviderOnReceipt
      ? "Show provider on receipt"
      : "Hide provider on receipt",
  );
  if (settings.receiptCustomFooterText?.trim()) {
    parts.push("Custom footer");
  }
  return parts.join(" · ");
}

export function parseCustomPaymentMethodNamesInput(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function customPaymentMethodNamesToInput(names: string[]): string {
  return names.join(", ");
}
