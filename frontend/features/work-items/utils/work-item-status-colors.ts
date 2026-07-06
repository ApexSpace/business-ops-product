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
    dotClass: "bg-[hsl(192_70%_40%)]",
    pillClass: "bg-[hsl(192_70%_96%)] text-[hsl(192_70%_32%)]",
    accentColor: "hsl(192 70% 40%)",
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
