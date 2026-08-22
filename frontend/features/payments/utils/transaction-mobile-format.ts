import { formatMoney, formatPaymentMethod } from "@/features/payments/schemas/payment-profile";
import { formatSalesListDate } from "@/features/sales/utils/sales-list-format";

export { formatMoney, formatPaymentMethod };

/** Alias so transactions mobile can share the Figma date format without coupling UI. */
export function formatSalesListDateSafe(iso: string | null | undefined): string {
  return formatSalesListDate(iso);
}
