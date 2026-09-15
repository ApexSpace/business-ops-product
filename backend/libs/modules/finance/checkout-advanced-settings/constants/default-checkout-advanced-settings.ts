import { BusinessCheckoutAdvancedSettings } from '@prisma/client';

export const DEFAULT_TIP_BUTTON_PERCENTS = [18, 20, 22];

export const DEFAULT_CHECKOUT_ADVANCED_SETTINGS: Omit<
  BusinessCheckoutAdvancedSettings,
  'id' | 'businessId' | 'createdAt' | 'updatedAt'
> = {
  customPaymentMethodNames: [],
  tipButtonPercents: DEFAULT_TIP_BUTTON_PERCENTS,
  hideTipButtons: false,
  askClientsForTip: true,
  askForTipProductsOnly: false,
  askClientsForSignature: false,
  enableCheckPayments: false,
  showChangeCalculator: false,
  showReceiptPreview: false,
  requireStaffForServices: false,
  requireStaffForProducts: false,
  requireStaffForGiftCards: false,
  requireStaffForPackages: false,
  showServiceProviderOnReceipt: true,
  receiptCustomFooterText: null,
};
