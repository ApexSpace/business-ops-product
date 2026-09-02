import { api } from "@/lib/api/client";

export interface CheckoutAdvancedSettings {
  id: string;
  businessId: string;
  customPaymentMethodNames: string[];
  tipButtonPercents: number[];
  hideTipButtons: boolean;
  askClientsForTip: boolean;
  askForTipProductsOnly: boolean;
  askClientsForSignature: boolean;
  enableCheckPayments: boolean;
  showChangeCalculator: boolean;
  showReceiptPreview: boolean;
  requireStaffForServices: boolean;
  requireStaffForProducts: boolean;
  requireStaffForGiftCards: boolean;
  requireStaffForPackages: boolean;
  showServiceProviderOnReceipt: boolean;
  receiptCustomFooterText?: string | null;
}

export type UpdateCheckoutAdvancedSettingsBody = Partial<
  Omit<CheckoutAdvancedSettings, "id" | "businessId">
>;

export function getCheckoutAdvancedSettings() {
  return api.get<CheckoutAdvancedSettings>("checkout-advanced-settings");
}

export function updateCheckoutAdvancedSettings(
  body: UpdateCheckoutAdvancedSettingsBody,
) {
  return api.patch<CheckoutAdvancedSettings>(
    "checkout-advanced-settings",
    body,
  );
}
