import { z } from "zod";
import { htmlToPlainText } from "@/features/notes/utils/html-text";
import type { Task, TaskPriority, TaskStatus } from "@/features/tasks/types";

export const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "TODO", label: "To do" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const TASK_PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

export function formatTaskStatus(status: TaskStatus): string {
  return TASK_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export function formatTaskPriority(priority: TaskPriority | null): string {
  if (!priority) return "—";
  return TASK_PRIORITY_OPTIONS.find((o) => o.value === priority)?.label ?? priority;
}

export function formatTaskDueAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Format for datetime-local input */
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

export const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(300),
  description: z.string().max(50000).optional(),
  dueAt: z.string().min(1, "Due date is required"),
  status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().or(z.literal("")),
  contactId: z.string().uuid().optional().or(z.literal("")),
  leadId: z.string().uuid().optional().or(z.literal("")),
  assignedToId: z.string().uuid().optional().or(z.literal("")),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const taskFormDefaults: TaskFormValues = {
  title: "",
  description: "",
  dueAt: toDatetimeLocalValue(new Date().toISOString()),
  status: "TODO",
  priority: "",
  contactId: "",
  leadId: "",
  assignedToId: "",
};

export function taskToForm(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? "",
    dueAt: toDatetimeLocalValue(task.dueAt),
    status: task.status,
    priority: task.priority ?? "",
    contactId: task.contactId ?? "",
    leadId: task.leadId ?? "",
    assignedToId: task.assignedToId ?? "",
  };
}

export function taskFormToApiBody(values: TaskFormValues) {
  const body: Record<string, string> = {
    title: values.title.trim(),
    description: values.description ?? "",
    dueAt: datetimeLocalToIso(values.dueAt),
    status: values.status,
  };
  if (values.contactId) body.contactId = values.contactId;
  if (values.leadId) body.leadId = values.leadId;
  if (values.priority) body.priority = values.priority;
  if (values.assignedToId) body.assignedToId = values.assignedToId;
  return body;
}

export function taskPreviewText(task: Task): string {
  if (task.descriptionText?.trim()) return task.descriptionText;
  return htmlToPlainText(task.description ?? "");
}

export function taskStatusVariant(
  status: TaskStatus,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "COMPLETED":
      return "secondary";
    case "IN_PROGRESS":
      return "default";
    case "CANCELLED":
      return "destructive";
    default:
      return "outline";
  }
}

export function taskPriorityVariant(
  priority: TaskPriority | null,
): "default" | "secondary" | "outline" {
  if (priority === "HIGH") return "default";
  if (priority === "MEDIUM") return "secondary";
  return "outline";
}
