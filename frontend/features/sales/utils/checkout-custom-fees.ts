import type { CheckoutItem } from "@/features/sales/types/checkout";

export interface CheckoutCustomFeeLine {
  id: string;
  name: string;
  amount: number;
}

function readMetadata(
  metadata: CheckoutItem["metadata"],
): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  return metadata;
}

export function isSystemManagedCustomFeeItem(item: CheckoutItem): boolean {
  const metadata = readMetadata(item.metadata);
  return typeof metadata?.customFeeId === "string";
}

export function getCheckoutCustomFeeLines(
  items: CheckoutItem[],
): CheckoutCustomFeeLine[] {
  return items
    .filter(
      (item) =>
        item.lineType === "CUSTOM" && isSystemManagedCustomFeeItem(item),
    )
    .map((item) => ({
      id: item.id,
      name: item.title,
      amount: parseFloat(item.totalPrice) || 0,
    }));
}

export function sumCheckoutCustomFeeLines(
  feeLines: CheckoutCustomFeeLine[],
): number {
  return feeLines.reduce((sum, line) => sum + line.amount, 0);
}

export function merchandiseSubtotalFromCheckout(
  subtotal: string | number,
  feeLines: CheckoutCustomFeeLine[],
): number {
  const subtotalValue =
    typeof subtotal === "number" ? subtotal : parseFloat(subtotal) || 0;
  const feeTotal = sumCheckoutCustomFeeLines(feeLines);
  return Math.max(0, Math.round((subtotalValue - feeTotal) * 100) / 100);
}
