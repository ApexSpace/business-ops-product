import type { InvoicePaymentStatus } from "@/lib/types/api";

export const INVOICE_PAYMENT_STATUS_OPTIONS: {
  value: InvoicePaymentStatus;
  label: string;
}[] = [
  { value: "UNPAID", label: "Unpaid" },
  { value: "PARTIALLY_PAID", label: "Partially Paid" },
  { value: "PAID", label: "Paid" },
  { value: "OVERPAID", label: "Overpaid" },
  { value: "REFUNDED", label: "Refunded" },
];

export function formatInvoicePaymentStatus(
  status: InvoicePaymentStatus,
): string {
  return (
    INVOICE_PAYMENT_STATUS_OPTIONS.find((o) => o.value === status)?.label ??
    status
  );
}

export function invoicePaymentStatusVariant(
  status: InvoicePaymentStatus,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "PAID":
      return "secondary";
    case "PARTIALLY_PAID":
      return "default";
    case "REFUNDED":
      return "destructive";
    default:
      return "outline";
  }
}
