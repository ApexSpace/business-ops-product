import type { WorkItemStatus } from "@/features/work-items/types";

export interface WorkItemStatusAccent {
  dotClass: string;
  pillClass: string;
  accentColor: string;
}

const STATUS_ACCENTS: Record<WorkItemStatus, WorkItemStatusAccent> = {
  DRAFT: {
    dotClass: "bg-muted-foreground",
    pillClass: "bg-muted text-muted-foreground",
    accentColor: "var(--muted-foreground)",
  },
  SCHEDULED: {
    dotClass: "bg-primary",
    pillClass: "bg-primary-tint text-primary-text",
    accentColor: "var(--primary)",
  },
  IN_PROGRESS: {
    dotClass: "bg-warning",
    pillClass: "bg-warning-subtle text-warning",
    accentColor: "var(--warning)",
  },
  COMPLETED: {
    dotClass: "bg-success",
    pillClass: "bg-success-subtle text-success",
    accentColor: "var(--success)",
  },
  CANCELLED: {
    dotClass: "bg-muted-foreground/70",
    pillClass: "bg-muted text-muted-foreground",
    accentColor: "var(--muted-foreground)",
  },
};

export function getWorkItemStatusAccent(
  status: WorkItemStatus,
): WorkItemStatusAccent {
  return STATUS_ACCENTS[status];
}
