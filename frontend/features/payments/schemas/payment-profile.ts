import { z } from "zod";
import type { Payment, PaymentMethod } from "@/features/payments/types";
import { formatMoney, invoiceStatusVariant } from "@/features/invoices/schemas/invoice-profile";

export { formatMoney, invoiceStatusVariant };

export const PAYMENT_METHOD_OPTIONS: {
  value: PaymentMethod;
  label: string;
}[] = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "STRIPE", label: "Stripe" },
  { value: "OTHER", label: "Other" },
];

export function formatPaymentMethod(method: PaymentMethod): string {
  return (
    PAYMENT_METHOD_OPTIONS.find((o) => o.value === method)?.label ?? method
  );
}

export function formatPaymentDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Date column for transactions table. */
export function formatTransactionDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

/** Payment processor / method shown as Provider. */
export function formatTransactionProvider(method: PaymentMethod): string {
  return formatPaymentMethod(method);
}

/** Where the payment was recorded (invoice-linked). */
export function formatTransactionSource(payment: Payment): string {
  if (payment.invoice?.invoiceNumber) {
    return payment.invoice.invoiceNumber;
  }
  return "Invoice";
}

export function transactionStatusVariant(): "default" | "secondary" | "outline" | "destructive" {
  return "secondary";
}

/** Recorded payments are successful transactions. */
export function getTransactionStatusLabel(_payment: Payment): string {
  return "Succeeded";
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function datetimeLocalToIso(value: string): string {
  if (!value) return new Date().toISOString();
  return new Date(value).toISOString();
}

export const paymentFormSchema = z.object({
  invoiceId: z.string().uuid("Select an invoice"),
  amount: z.number().min(0.01, "Amount must be greater than zero"),
  method: z.enum(["CASH", "CARD", "BANK_TRANSFER", "STRIPE", "OTHER"]),
  paidAt: z.string().min(1, "Paid date is required"),
  reference: z.string().max(200).optional(),
  notes: z.string().max(5000).optional(),
});

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export const paymentFormDefaults: PaymentFormValues = {
  invoiceId: "",
  amount: 0,
  method: "CASH",
  paidAt: toDatetimeLocalValue(new Date().toISOString()),
  reference: "",
  notes: "",
};

export function paymentToForm(payment: Payment): PaymentFormValues {
  return {
    invoiceId: payment.invoiceId,
    amount: parseFloat(payment.amount),
    method: payment.method,
    paidAt: toDatetimeLocalValue(payment.paidAt),
    reference: payment.reference ?? "",
    notes: payment.notes ?? "",
  };
}

export function paymentFormToApiBody(values: PaymentFormValues) {
  return {
    invoiceId: values.invoiceId,
    amount: values.amount,
    method: values.method,
    paidAt: datetimeLocalToIso(values.paidAt),
    reference: values.reference?.trim() || undefined,
    notes: values.notes?.trim() || undefined,
  };
}

export function invoicePickerLabel(
  invoiceNumber: string,
  balanceDue: string,
  contactLabel?: string,
): string {
  const balance = formatMoney(balanceDue);
  const customer = contactLabel ? ` · ${contactLabel}` : "";
  return `${invoiceNumber}${customer} — ${balance} due`;
}
