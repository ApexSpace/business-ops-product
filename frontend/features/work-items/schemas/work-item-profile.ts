import { z } from "zod";
import type { WorkItem, WorkItemStatus } from "@/features/work-items/types";

export const WORK_ITEM_STATUS_OPTIONS: { value: WorkItemStatus; label: string }[] =
  [
    { value: "DRAFT", label: "Draft" },
    { value: "SCHEDULED", label: "Scheduled" },
    { value: "IN_PROGRESS", label: "In progress" },
    { value: "COMPLETED", label: "Completed" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

export const workItemFormSchema = z.object({
  contactId: z.string().min(1, "Customer is required"),
  serviceId: z.string().optional(),
  title: z.string().min(1, "Title is required").max(300),
  status: z.enum([
    "DRAFT",
    "SCHEDULED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
  ]),
  scheduledAt: z.string().optional(),
  assignedToId: z.string().optional(),
  amount: z.string().optional(),
  description: z.string().optional(),
});

export type WorkItemFormValues = z.infer<typeof workItemFormSchema>;

export const workItemFormDefaults: WorkItemFormValues = {
  contactId: "",
  serviceId: "",
  title: "",
  status: "DRAFT",
  scheduledAt: "",
  assignedToId: "",
  amount: "",
  description: "",
};

function toLocalDatetimeInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDatetimeInput(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export function workItemToForm(item: WorkItem): WorkItemFormValues {
  return {
    contactId: item.contactId,
    serviceId: item.serviceId ?? "",
    title: item.title,
    status: item.status,
    scheduledAt: toLocalDatetimeInput(item.scheduledAt),
    assignedToId: item.assignedToId ?? "",
    amount: item.amount ?? "",
    description: item.description ?? "",
  };
}

export function workItemFormToApiBody(values: WorkItemFormValues) {
  const amountRaw = values.amount?.trim();
  const amount =
    amountRaw === "" || amountRaw === undefined
      ? undefined
      : Number.parseFloat(amountRaw);

  return {
    contactId: values.contactId,
    serviceId: values.serviceId?.trim() || undefined,
    title: values.title.trim(),
    status: values.status,
    scheduledAt: fromLocalDatetimeInput(values.scheduledAt ?? ""),
    assignedToId: values.assignedToId?.trim() || undefined,
    amount: amount !== undefined && !Number.isNaN(amount) ? amount : undefined,
    description: values.description?.trim() || undefined,
  };
}

export function formatWorkItemStatus(status: WorkItemStatus): string {
  return (
    WORK_ITEM_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
  );
}

export function formatWorkItemScheduledAt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatWorkItemAmount(amount: string | null): string | null {
  if (!amount) return null;
  const n = Number.parseFloat(amount);
  if (Number.isNaN(n)) return null;
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

export function getWorkItemAssigneeName(item: WorkItem): string | null {
  if (!item.assignedTo) return null;
  const name = [item.assignedTo.firstName, item.assignedTo.lastName]
    .filter(Boolean)
    .join(" ");
  return name || item.assignedTo.email;
}

export function workItemStatusIndicatorClass(status: WorkItemStatus): string {
  switch (status) {
    case "DRAFT":
      return "bg-muted-foreground/45";
    case "SCHEDULED":
      return "bg-sky-500";
    case "IN_PROGRESS":
      return "bg-amber-500";
    case "COMPLETED":
      return "bg-emerald-500";
    case "CANCELLED":
      return "bg-destructive/70";
    default:
      return "bg-muted-foreground/45";
  }
}
