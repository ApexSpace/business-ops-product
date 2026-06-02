import { z } from "zod";
import type { Estimate, Invoice, InvoiceItem, InvoiceStatus } from "@/types/api";

export const INVOICE_STATUS_OPTIONS: {
  value: InvoiceStatus;
  label: string;
}[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "PARTIAL", label: "Partial" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "VOID", label: "Void" },
];

/** Statuses users may set manually — OVERDUE is set when the due date passes. */
export const INVOICE_MANUAL_STATUS_OPTIONS = INVOICE_STATUS_OPTIONS.filter(
  (o) => o.value !== "OVERDUE",
);

export function formatInvoiceStatus(status: InvoiceStatus): string {
  return (
    INVOICE_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
  );
}

export function invoiceStatusVariant(
  status: InvoiceStatus,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "PAID":
      return "secondary";
    case "SENT":
    case "PARTIAL":
      return "default";
    case "OVERDUE":
    case "VOID":
      return "destructive";
    default:
      return "outline";
  }
}

export function formatMoney(value: string | number): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return "$0.00";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export function formatInvoiceDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const invoiceLineSchema = z.object({
  serviceId: z.string().uuid().optional().or(z.literal("")),
  title: z.string().min(1, "Title required").max(300),
  description: z.string().max(2000).optional(),
  quantity: z.number().min(0.0001, "Qty must be > 0"),
  unitPrice: z.number().min(0, "Price must be ≥ 0"),
});

export const invoiceFormSchema = z.object({
  contactId: z.string().uuid("Select a customer"),
  estimateId: z.string().uuid().optional().or(z.literal("")),
  workItemId: z.string().uuid().optional().or(z.literal("")),
  issueDate: z.string().min(1, "Issue date required"),
  dueDate: z.string().optional(),
  status: z.enum(["DRAFT", "SENT", "PARTIAL", "PAID", "OVERDUE", "VOID"]),
  taxAmount: z.number().min(0),
  discountAmount: z.number().min(0),
  notes: z.string().max(5000).optional(),
  paymentTerms: z.string().max(500).optional(),
  termsAndConditions: z.string().max(10000).optional(),
  invoiceNumberPreview: z.string().optional(),
  items: z.array(invoiceLineSchema).min(1, "Add at least one line item"),
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
export type InvoiceLineFormValues = z.infer<typeof invoiceLineSchema>;

export const emptyLineItem = (): InvoiceLineFormValues => ({
  serviceId: "",
  title: "",
  description: "",
  quantity: 1,
  unitPrice: 0,
});

export const invoiceFormDefaults: InvoiceFormValues = {
  contactId: "",
  estimateId: "",
  workItemId: "",
  issueDate: toDateInputValue(new Date().toISOString()),
  dueDate: "",
  status: "DRAFT",
  taxAmount: 0,
  discountAmount: 0,
  notes: "",
  paymentTerms: "",
  termsAndConditions: "",
  invoiceNumberPreview: "",
  items: [emptyLineItem()],
};

export function lineTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}

export function calculateFormTotals(values: Pick<
  InvoiceFormValues,
  "items" | "taxAmount" | "discountAmount"
>) {
  const subtotal = values.items.reduce(
    (sum, item) => sum + lineTotal(item.quantity, item.unitPrice),
    0,
  );
  const tax = values.taxAmount ?? 0;
  const discount = values.discountAmount ?? 0;
  const total = Math.max(0, subtotal + tax - discount);
  return { subtotal, tax, discount, total };
}

export function invoiceToForm(invoice: Invoice): InvoiceFormValues {
  return {
    contactId: invoice.contactId,
    estimateId: invoice.estimateId ?? "",
    workItemId: invoice.workItemId ?? "",
    issueDate: toDateInputValue(invoice.issueDate),
    dueDate: toDateInputValue(invoice.dueDate),
    status: invoice.status,
    taxAmount: parseFloat(invoice.taxAmount) || 0,
    discountAmount: parseFloat(invoice.discountAmount) || 0,
    notes: invoice.notes ?? "",
    paymentTerms: invoice.paymentTerms ?? "",
    termsAndConditions: invoice.termsAndConditions ?? "",
    items:
      invoice.items.length > 0
        ? invoice.items.map(itemToFormLine)
        : [emptyLineItem()],
  };
}

function itemToFormLine(item: InvoiceItem): InvoiceLineFormValues {
  return {
    serviceId: item.serviceId ?? "",
    title: item.title,
    description: item.description ?? "",
    quantity: parseFloat(item.quantity) || 1,
    unitPrice: parseFloat(item.unitPrice) || 0,
  };
}

export function invoiceFromEstimate(estimate: Estimate): InvoiceFormValues {
  return {
    contactId: estimate.contactId,
    estimateId: estimate.id,
    workItemId: estimate.workItemId ?? "",
    issueDate: toDateInputValue(new Date().toISOString()),
    dueDate: toDateInputValue(estimate.expiryDate),
    status: "DRAFT",
    taxAmount: parseFloat(estimate.taxAmount) || 0,
    discountAmount: parseFloat(estimate.discountAmount) || 0,
    notes: estimate.notes ?? "",
    paymentTerms: "",
    termsAndConditions: "",
    items: estimate.items.map((item) => ({
      serviceId: item.serviceId ?? "",
      title: item.title,
      description: item.description ?? "",
      quantity: parseFloat(item.quantity) || 1,
      unitPrice: parseFloat(item.unitPrice) || 0,
    })),
  };
}

export function invoiceFormToApiBody(values: InvoiceFormValues) {
  return {
    contactId: values.contactId,
    ...(values.estimateId ? { estimateId: values.estimateId } : {}),
    ...(values.workItemId ? { workItemId: values.workItemId } : {}),
    issueDate: new Date(values.issueDate).toISOString(),
    ...(values.dueDate
      ? { dueDate: new Date(values.dueDate).toISOString() }
      : {}),
    status: values.status,
    taxAmount: values.taxAmount,
    discountAmount: values.discountAmount,
    notes: values.notes?.trim() || undefined,
    paymentTerms: values.paymentTerms?.trim() || undefined,
    termsAndConditions: values.termsAndConditions?.trim() || undefined,
    items: values.items.map((item) => ({
      ...(item.serviceId ? { serviceId: item.serviceId } : {}),
      title: item.title.trim(),
      ...(item.description?.trim()
        ? { description: item.description.trim() }
        : {}),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  };
}
