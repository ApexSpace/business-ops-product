import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Clock,
  Package,
  ShoppingBag,
  UserRound,
  Wallet,
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
  | "profile"
  | "timeline"
  | "wallet"
  | "memberships"
  | "adjustments"
  | "sales"
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
  "timeline";

export type ContactMobilePanel = "details" | "conversation" | "records";

export interface ContactRailItem {
  id: string;
  label: string;
  icon: LucideIcon;
  sectionId: ContactRecordsSectionId;
  placeholder?: boolean;
}

/** Rail order: Mangomint-aligned primary tabs */
export const CONTACT_RAIL_ITEMS: ContactRailItem[] = [
  {
    id: "timeline",
    label: "Timeline",
    icon: Activity,
    sectionId: "timeline",
  },
  {
    id: "wallet",
    label: "Wallet",
    icon: Wallet,
    sectionId: "wallet",
  },
  {
    id: "memberships",
    label: "Memberships",
    icon: Package,
    sectionId: "memberships",
  },
  {
    id: "adjustments",
    label: "Adjustments",
    icon: Clock,
    sectionId: "adjustments",
  },
  {
    id: "sales",
    label: "Sales",
    icon: ShoppingBag,
    sectionId: "sales",
  },
  {
    id: "profile",
    label: "Profile",
    icon: UserRound,
    sectionId: "profile",
  },
];

export function getRecordsSectionTitle(
  section: ContactRecordsSectionId,
  labels: IndustryLabels,
): string {
  switch (section) {
    case "profile":
      return "Contact details";
    case "timeline":
      return "Timeline";
    case "wallet":
      return "Wallet";
    case "memberships":
      return "Memberships & packages";
    case "adjustments":
      return "Custom service durations";
    case "sales":
      return "Sales";
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

/** Workspace inset from shell edges (tighter top gap below page heading) */
export const WORKSPACE_PADDING_CLASS =
  "px-2 pb-2 pt-[var(--page-content-top-gap)] sm:px-2.5 sm:pb-2.5 lg:px-3 lg:pb-3";

/** Tight gap between columns (all breakpoints) */
export const WORKSPACE_GAP_CLASS = "gap-1.5 sm:gap-2";

/**
 * Desktop xl+ — conversation fills left; contact sidebar on the right.
 */
export const WORKSPACE_DESKTOP_ROW_CLASS = [
  "hidden h-full min-h-0 w-full max-w-full flex-1 items-stretch overflow-x-auto overflow-y-hidden xl:grid",
  WORKSPACE_GAP_CLASS,
  WORKSPACE_PADDING_CLASS,
  "xl:grid-cols-[minmax(360px,1fr)_minmax(280px,340px)]",
  "2xl:grid-cols-[minmax(420px,1fr)_360px]",
].join(" ");

/** Grid/flex cell wrapper — track size comes from parent layout */
export const WORKSPACE_COLUMN_CELL_CLASS =
  "flex h-full min-h-0 min-w-0 w-full overflow-hidden";

/** @deprecated use WORKSPACE_COLUMN_CELL_CLASS */
export const WORKSPACE_DETAILS_COL_CLASS = WORKSPACE_COLUMN_CELL_CLASS;
export const WORKSPACE_CONVERSATION_COL_CLASS = WORKSPACE_COLUMN_CELL_CLASS;
export const WORKSPACE_RECORDS_COL_CLASS = WORKSPACE_COLUMN_CELL_CLASS;
/** Tablet md–xl: conversation + sidebar in one row */
export const WORKSPACE_TABLET_MAIN_ROW_CLASS = [
  "flex h-full min-h-0 w-full flex-1 overflow-hidden",
  WORKSPACE_GAP_CLASS,
].join(" ");

export const WORKSPACE_TABLET_CONVERSATION_COL_CLASS =
  "flex h-full min-h-0 min-w-[240px] flex-1 basis-0 overflow-hidden";

export const WORKSPACE_TABLET_SIDEBAR_COL_CLASS =
  "flex h-full min-h-0 w-[min(34%,300px)] min-w-[240px] max-w-[320px] shrink-0 overflow-hidden";

/** @deprecated tablet bottom row removed — records live in sidebar */
export const WORKSPACE_TABLET_DETAILS_COL_CLASS =
  WORKSPACE_TABLET_SIDEBAR_COL_CLASS;

/** @deprecated */
export const WORKSPACE_TABLET_BOTTOM_ROW_CLASS =
  "hidden";

/** @deprecated */
export const WORKSPACE_TABLET_RECORDS_COL_CLASS =
  WORKSPACE_COLUMN_CELL_CLASS;

/** Legacy per-contact workspace route (`/business/contacts/[id]`). List page uses standard shell padding. */
export function isContactWorkspacePath(pathname: string): boolean {
  return /^\/business\/contacts\/[^/]+$/.test(pathname);
}

/** Conversations inbox — same full-bleed shell treatment as contact workspace. */
export function isConversationsInboxPath(pathname: string): boolean {
  return pathname === "/business/conversations";
}

/**
 * Desktop xl+ — list, thread, and contact sidebar (matches contact workspace spacing).
 */
export const INBOX_DESKTOP_ROW_CLASS = [
  "hidden h-full min-h-0 w-full max-w-full flex-1 items-stretch overflow-x-auto overflow-y-hidden xl:grid",
  WORKSPACE_GAP_CLASS,
  WORKSPACE_PADDING_CLASS,
  "xl:grid-cols-[minmax(240px,280px)_minmax(420px,2.2fr)_minmax(260px,300px)]",
  "2xl:grid-cols-[260px_minmax(520px,2.4fr)_300px]",
].join(" ");

/** Tablet md–xl: list + thread + sidebar in one row */
export const INBOX_TABLET_MAIN_ROW_CLASS = [
  "flex h-full min-h-0 w-full flex-1 overflow-hidden",
  WORKSPACE_GAP_CLASS,
].join(" ");

export const INBOX_TABLET_LIST_COL_CLASS =
  "flex h-full min-h-0 w-[min(32%,260px)] min-w-[220px] max-w-[280px] shrink-0 overflow-hidden";

export const INBOX_TABLET_THREAD_COL_CLASS =
  "flex h-full min-h-0 min-w-[300px] flex-[1.6] basis-0 overflow-hidden";

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
