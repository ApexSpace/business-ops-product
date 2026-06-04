import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bot,
  Calendar,
  CheckSquare,
  ClipboardList,
  Receipt,
  StickyNote,
  Target,
  Wallet,
  Wrench,
} from "lucide-react";
import type { Contact, IndustryLabels, Lead, Note, Task, WorkItem } from "@/features/contacts/types";
import { getLeadDisplayTitle } from "@/features/leads/utils/leads";
import { formatWorkItemStatus } from "@/features/work-items/schemas/work-item-profile";
import { notePreviewText } from "@/features/notes/schemas/note-profile";
import {
  formatTaskDueAt,
  formatTaskStatus,
  taskPreviewText,
} from "@/features/tasks/schemas/task-profile";
import { formatDateTimeInTimezone } from "@/features/calendars/utils/timezone";

export type ContactRecordsSectionId =
  | "leads"
  | "work-items"
  | "appointments"
  | "notes"
  | "tasks"
  | "activity"
  | "invoices"
  | "estimates"
  | "payments"
  | "automations";

export const DEFAULT_CONTACT_RECORDS_SECTION: ContactRecordsSectionId =
  "activity";

export type ContactMobilePanel =
  | "details"
  | "conversation"
  | "records"
  | "actions";

export interface ContactRailItem {
  id: string;
  label: string;
  icon: LucideIcon;
  sectionId: ContactRecordsSectionId;
  placeholder?: boolean;
}

/** Rail order: activity first (default), then operational sections */
export const CONTACT_RAIL_ITEMS: ContactRailItem[] = [
  {
    id: "activity",
    label: "Activity",
    icon: Activity,
    sectionId: "activity",
  },
  {
    id: "leads",
    label: "Opportunities",
    icon: Target,
    sectionId: "leads",
  },
  {
    id: "work-items",
    label: "Work items",
    icon: Wrench,
    sectionId: "work-items",
  },
  {
    id: "appointments",
    label: "Appointments",
    icon: Calendar,
    sectionId: "appointments",
  },
  {
    id: "notes",
    label: "Notes",
    icon: StickyNote,
    sectionId: "notes",
  },
  {
    id: "tasks",
    label: "Tasks",
    icon: CheckSquare,
    sectionId: "tasks",
  },
  {
    id: "invoices",
    label: "Invoices",
    icon: Receipt,
    sectionId: "invoices",
  },
  {
    id: "estimates",
    label: "Estimates",
    icon: ClipboardList,
    sectionId: "estimates",
  },
  {
    id: "payments",
    label: "Received Payments",
    icon: Wallet,
    sectionId: "payments",
  },
  {
    id: "automations",
    label: "Automations",
    icon: Bot,
    sectionId: "automations",
    placeholder: true,
  },
];

export function getRecordsSectionTitle(
  section: ContactRecordsSectionId,
  labels: IndustryLabels,
): string {
  switch (section) {
    case "leads":
      return labels.leads;
    case "work-items":
      return labels.workItems;
    case "appointments":
      return labels.appointments;
    case "notes":
      return "Notes";
    case "tasks":
      return "Tasks";
    case "activity":
      return "Activity";
    case "invoices":
      return "Invoices";
    case "estimates":
      return "Estimates";
    case "payments":
      return "Received Payments";
    case "automations":
      return "Automations";
    default:
      return "Records";
  }
}

export function isPlaceholderSection(section: ContactRecordsSectionId): boolean {
  return section === "automations";
}

/** Shared panel chrome — equal-height workspace boxes */
export const WORKSPACE_PANEL_CLASS =
  "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-elevation-xs";

/** Workspace inset from shell edges */
export const WORKSPACE_PADDING_CLASS = "p-2 sm:p-2.5 lg:p-3";

/** Tight gap between columns (all breakpoints) */
export const WORKSPACE_GAP_CLASS = "gap-1.5 sm:gap-2";

/**
 * Desktop xl+ — grid with fixed side tracks; center fills remainder (not all extra space on narrow lg).
 * Below xl, tablet layout is used instead of squeezing four columns.
 */
export const WORKSPACE_DESKTOP_ROW_CLASS = [
  "hidden h-full min-h-0 w-full max-w-full flex-1 items-stretch overflow-x-auto overflow-y-hidden xl:grid",
  WORKSPACE_GAP_CLASS,
  WORKSPACE_PADDING_CLASS,
  "xl:grid-cols-[280px_minmax(240px,1fr)_300px_3rem]",
  "2xl:grid-cols-[320px_minmax(280px,1fr)_360px_3.5rem]",
].join(" ");

/** Grid/flex cell wrapper — track size comes from parent layout */
export const WORKSPACE_COLUMN_CELL_CLASS =
  "flex h-full min-h-0 min-w-0 w-full overflow-hidden";

/** @deprecated use WORKSPACE_COLUMN_CELL_CLASS */
export const WORKSPACE_DETAILS_COL_CLASS = WORKSPACE_COLUMN_CELL_CLASS;
export const WORKSPACE_CONVERSATION_COL_CLASS = WORKSPACE_COLUMN_CELL_CLASS;
export const WORKSPACE_RECORDS_COL_CLASS = WORKSPACE_COLUMN_CELL_CLASS;
export const WORKSPACE_RAIL_COL_CLASS = WORKSPACE_COLUMN_CELL_CLASS;

/** Tablet md–xl: contact + conversation (balanced flex, no tiny side columns) */
export const WORKSPACE_TABLET_MAIN_ROW_CLASS = [
  "flex min-h-0 flex-1 overflow-hidden",
  WORKSPACE_GAP_CLASS,
].join(" ");

export const WORKSPACE_TABLET_DETAILS_COL_CLASS =
  "flex h-full min-h-0 w-[min(38%,320px)] min-w-[240px] max-w-[360px] shrink-0 overflow-hidden";

export const WORKSPACE_TABLET_CONVERSATION_COL_CLASS =
  "flex h-full min-h-0 min-w-[200px] flex-1 basis-0 overflow-hidden";

/** Tablet: records + rail */
export const WORKSPACE_TABLET_BOTTOM_ROW_CLASS = [
  "flex shrink-0 overflow-hidden",
  WORKSPACE_GAP_CLASS,
  "min-h-[200px] max-h-[min(38vh,300px)]",
].join(" ");

export const WORKSPACE_TABLET_RECORDS_COL_CLASS =
  "flex min-h-0 min-w-0 flex-1 basis-0 overflow-hidden";

export const WORKSPACE_TABLET_RAIL_COL_CLASS = "flex w-11 shrink-0 overflow-hidden";

/** Contact detail workspace route (full-bleed below topbar, no shell content padding). */
export function isContactWorkspacePath(pathname: string): boolean {
  return /^\/business\/contacts\/[^/]+$/.test(pathname);
}

export type TimelineEventType =
  | "contact_created"
  | "lead_created"
  | "lead_updated"
  | "work_item_created"
  | "work_item_updated"
  | "note_created"
  | "note_updated"
  | "task_created"
  | "task_updated"
  | "task_completed"
  | "task_due";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  at: string;
}

function formatWhen(iso: string, timezone?: string): string {
  if (timezone) return formatDateTimeInTimezone(iso, timezone);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function buildContactTimeline(
  contact: Contact,
  leads: Lead[],
  workItems: WorkItem[],
  notes: Note[] = [],
  tasks: Task[] = [],
): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      id: `contact-${contact.id}-created`,
      type: "contact_created",
      title: "Contact created",
      description: contact.label,
      at: contact.createdAt,
    },
  ];

  for (const lead of leads) {
    events.push({
      id: `lead-${lead.id}-created`,
      type: "lead_created",
      title: "Lead created",
      description: getLeadDisplayTitle(lead),
      at: lead.createdAt,
    });
    if (lead.updatedAt !== lead.createdAt) {
      events.push({
        id: `lead-${lead.id}-updated`,
        type: "lead_updated",
        title: "Lead updated",
        description: `${getLeadDisplayTitle(lead)} · ${lead.status.toLowerCase()}`,
        at: lead.updatedAt,
      });
    }
  }

  for (const item of workItems) {
    events.push({
      id: `work-${item.id}-created`,
      type: "work_item_created",
      title: "Work item created",
      description: `${item.title} · ${formatWorkItemStatus(item.status)}`,
      at: item.createdAt,
    });
    if (item.updatedAt !== item.createdAt) {
      events.push({
        id: `work-${item.id}-updated`,
        type: "work_item_updated",
        title: "Work item updated",
        description: `${item.title} · ${formatWorkItemStatus(item.status)}`,
        at: item.updatedAt,
      });
    }
  }

  for (const note of notes) {
    events.push({
      id: `note-${note.id}-created`,
      type: "note_created",
      title: "Note created",
      description: `${note.title}${notePreviewText(note) ? ` · ${notePreviewText(note)}` : ""}`,
      at: note.createdAt,
    });
    if (note.updatedAt !== note.createdAt) {
      events.push({
        id: `note-${note.id}-updated`,
        type: "note_updated",
        title: "Note updated",
        description: note.title,
        at: note.updatedAt,
      });
    }
  }

  for (const task of tasks) {
    events.push({
      id: `task-${task.id}-created`,
      type: "task_created",
      title: "Task created",
      description: `${task.title} · due ${formatTaskDueAt(task.dueAt)}`,
      at: task.createdAt,
    });
    if (task.updatedAt !== task.createdAt) {
      events.push({
        id: `task-${task.id}-updated`,
        type: "task_updated",
        title: "Task updated",
        description: `${task.title} · ${formatTaskStatus(task.status)}`,
        at: task.updatedAt,
      });
    }
    if (task.completedAt) {
      events.push({
        id: `task-${task.id}-completed`,
        type: "task_completed",
        title: "Task completed",
        description: task.title,
        at: task.completedAt,
      });
    }
    if (task.status !== "COMPLETED" && task.status !== "CANCELLED") {
      events.push({
        id: `task-${task.id}-due`,
        type: "task_due",
        title: "Task due",
        description: `${task.title} · ${formatTaskDueAt(task.dueAt)}`,
        at: task.dueAt,
      });
    }
  }

  return events.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}

export function formatContactCreatedAt(
  iso: string,
  timezone?: string,
): string {
  return formatWhen(iso, timezone);
}

export function getContactAssigneeFromLeads(leads: Lead[]): string | null {
  const withAssignee = leads.find((l) => l.assignedTo);
  if (!withAssignee?.assignedTo) return null;
  const a = withAssignee.assignedTo;
  const name = [a.firstName, a.lastName].filter(Boolean).join(" ");
  return name || a.email;
}

export function formatContactAddress(contact: Contact): string | null {
  const parts = [
    contact.address,
    [contact.city, contact.state].filter(Boolean).join(", "),
    contact.zip,
    contact.country,
  ].filter((p) => p?.trim());
  if (!parts.length) return null;
  return parts.join(", ");
}
