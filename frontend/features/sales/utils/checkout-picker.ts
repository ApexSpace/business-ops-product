import type { CheckoutProductPickerItem } from "@/features/sales/types/checkout";
import { formatMoney } from "@/features/payments/utils/currencies";

export function pickerProductKey(product: CheckoutProductPickerItem): string {
  return product.variantId
    ? `${product.productId}:${product.variantId}`
    : product.productId;
}

export function productPickerLabel(product: CheckoutProductPickerItem): string {
  const price = formatMoney(parseFloat(product.unitPrice));
  const variant = product.variantLabel ? ` (${product.variantLabel})` : "";
  return `${product.name}${variant} — ${price}`;
}
