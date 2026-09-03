import type { CheckoutAdvancedSettings } from "@/features/checkout-advanced-settings/api/checkout-advanced-settings.api";
import type { Checkout, CheckoutItem } from "@/features/sales/types/checkout";

function lineRequiresStaff(
  settings: CheckoutAdvancedSettings,
  item: CheckoutItem,
  productAssignStaff?: boolean,
): boolean {
  switch (item.lineType) {
    case "SERVICE":
      return settings.requireStaffForServices;
    case "PRODUCT":
      return settings.requireStaffForProducts || Boolean(productAssignStaff);
    case "GIFT_CARD":
      return settings.requireStaffForGiftCards;
    case "PACKAGE":
      return settings.requireStaffForPackages;
    default:
      return false;
  }
}

export function checkoutStaffRequirementGaps(
  checkout: Checkout,
  settings: CheckoutAdvancedSettings | undefined,
  productAssignStaffByProductId?: Record<string, boolean>,
): CheckoutItem[] {
  if (!settings) return [];

  return checkout.items.filter((item) => {
    if (item.staffUserId) return false;
    const productAssign =
      item.productId != null
        ? productAssignStaffByProductId?.[item.productId]
        : false;
    return lineRequiresStaff(settings, item, productAssign);
  });
}

export function checkoutHasStaffRequirementGaps(
  checkout: Checkout,
  settings: CheckoutAdvancedSettings | undefined,
): boolean {
  return checkoutStaffRequirementGaps(checkout, settings).length > 0;
}
