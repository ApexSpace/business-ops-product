import { z } from "zod";
import type { Estimate, EstimateItem, EstimateStatus } from "@/features/estimates/types";
import { formatMoney } from "@/features/payments/utils/currencies";

export { formatMoney };

export const ESTIMATE_STATUS_OPTIONS: {
  value: EstimateStatus;
  label: string;
}[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CONVERTED", label: "Converted" },
];

/** Statuses users may set manually — EXPIRED and CONVERTED are system-driven. */
export const ESTIMATE_MANUAL_STATUS_OPTIONS = ESTIMATE_STATUS_OPTIONS.filter(
  (o) => o.value !== "EXPIRED" && o.value !== "CONVERTED",
);

export function formatEstimateStatus(status: EstimateStatus): string {
  return (
    ESTIMATE_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
  );
}

export function estimateStatusVariant(
  status: EstimateStatus,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "APPROVED":
    case "CONVERTED":
      return "secondary";
    case "SENT":
      return "default";
    case "REJECTED":
    case "EXPIRED":
      return "destructive";
    default:
      return "outline";
  }
}

export function formatEstimateDate(iso: string | null | undefined): string {
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

export const estimateLineSchema = z.object({
  serviceId: z.string().uuid().optional().or(z.literal("")),
  title: z.string().min(1, "Title required").max(300),
  description: z.string().max(2000).optional(),
  quantity: z.number().min(0.0001, "Qty must be > 0"),
  unitPrice: z.number().min(0, "Price must be ≥ 0"),
});

export const estimateFormSchema = z.object({
  contactId: z.string().uuid("Select a customer"),
  workItemId: z.string().uuid().optional().or(z.literal("")),
  issueDate: z.string().min(1, "Issue date required"),
  expiryDate: z.string().optional(),
  status: z.enum([
    "DRAFT",
    "SENT",
    "APPROVED",
    "REJECTED",
    "EXPIRED",
    "CONVERTED",
  ]),
  taxAmount: z.number().min(0),
  discountAmount: z.number().min(0),
  notes: z.string().max(5000).optional(),
  termsAndConditions: z.string().max(10000).optional(),
  estimateNumberPreview: z.string().optional(),
  items: z.array(estimateLineSchema).min(1, "Add at least one line item"),
});

export type EstimateFormValues = z.infer<typeof estimateFormSchema>;
export type EstimateLineFormValues = z.infer<typeof estimateLineSchema>;

export const emptyLineItem = (): EstimateLineFormValues => ({
  serviceId: "",
  title: "",
  description: "",
  quantity: 1,
  unitPrice: 0,
});

export const estimateFormDefaults: EstimateFormValues = {
  contactId: "",
  workItemId: "",
  issueDate: toDateInputValue(new Date().toISOString()),
  expiryDate: "",
  status: "DRAFT",
  taxAmount: 0,
  discountAmount: 0,
  notes: "",
  termsAndConditions: "",
  estimateNumberPreview: "",
  items: [emptyLineItem()],
};

export function lineTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}

export function calculateFormTotals(values: Pick<
  EstimateFormValues,
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

export function estimateToForm(estimate: Estimate): EstimateFormValues {
  return {
    contactId: estimate.contactId,
    workItemId: estimate.workItemId ?? "",
    issueDate: toDateInputValue(estimate.issueDate),
    expiryDate: toDateInputValue(estimate.expiryDate),
    status: estimate.status,
    taxAmount: parseFloat(estimate.taxAmount) || 0,
    discountAmount: parseFloat(estimate.discountAmount) || 0,
    notes: estimate.notes ?? "",
    termsAndConditions: estimate.termsAndConditions ?? "",
    items:
      estimate.items.length > 0
        ? estimate.items.map((item) => itemToFormLine(item))
        : [emptyLineItem()],
  };
}

function itemToFormLine(item: EstimateItem): EstimateLineFormValues {
  return {
    serviceId: item.serviceId ?? "",
    title: item.title,
    description: item.description ?? "",
    quantity: parseFloat(item.quantity) || 1,
    unitPrice: parseFloat(item.unitPrice) || 0,
  };
}

export function estimateFormToApiBody(values: EstimateFormValues) {
  return {
    contactId: values.contactId,
    ...(values.workItemId ? { workItemId: values.workItemId } : {}),
    issueDate: new Date(values.issueDate).toISOString(),
    ...(values.expiryDate
      ? { expiryDate: new Date(values.expiryDate).toISOString() }
      : {}),
    status: values.status,
    taxAmount: values.taxAmount,
    discountAmount: values.discountAmount,
    notes: values.notes?.trim() || undefined,
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
