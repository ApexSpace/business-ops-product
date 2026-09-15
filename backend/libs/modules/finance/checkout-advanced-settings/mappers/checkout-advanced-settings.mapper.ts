import { BusinessCheckoutAdvancedSettings } from '@prisma/client';
import { CheckoutAdvancedSettingsResponseDto } from '../dto/checkout-advanced-settings.dto';

export function toCheckoutAdvancedSettingsResponse(
  row: BusinessCheckoutAdvancedSettings,
): CheckoutAdvancedSettingsResponseDto {
  return {
    id: row.id,
    businessId: row.businessId,
    customPaymentMethodNames: row.customPaymentMethodNames,
    tipButtonPercents: row.tipButtonPercents,
    hideTipButtons: row.hideTipButtons,
    askClientsForTip: row.askClientsForTip,
    askForTipProductsOnly: row.askForTipProductsOnly,
    askClientsForSignature: row.askClientsForSignature,
    enableCheckPayments: row.enableCheckPayments,
    showChangeCalculator: row.showChangeCalculator,
    showReceiptPreview: row.showReceiptPreview,
    requireStaffForServices: row.requireStaffForServices,
    requireStaffForProducts: row.requireStaffForProducts,
    requireStaffForGiftCards: row.requireStaffForGiftCards,
    requireStaffForPackages: row.requireStaffForPackages,
    showServiceProviderOnReceipt: row.showServiceProviderOnReceipt,
    receiptCustomFooterText: row.receiptCustomFooterText,
  };
}
