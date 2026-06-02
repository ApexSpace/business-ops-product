"use client";

import { Check, Clock, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { ContactEstimatesPanel } from "@/components/contacts/contact-workspace/contact-estimates-panel";
import { ContactInvoicesPanel } from "@/components/contacts/contact-workspace/contact-invoices-panel";
import { ContactPaymentsPanel } from "@/components/contacts/contact-workspace/contact-payments-panel";
import { RichTextPreview } from "@/components/forms/rich-text-editor";
import { EmptyState } from "@/components/data-display/empty-state";
import { ActionButton } from "@/components/ui/action-button";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";
import {
  buildContactTimeline,
  CONTACT_RAIL_ITEMS,
  formatContactCreatedAt,
  getRecordsSectionTitle,
  isPlaceholderSection,
  type ContactRecordsSectionId,
  WORKSPACE_PANEL_CLASS,
} from "@/lib/contact-workspace";
import {
  formatLeadValue,
  getLeadDisplayTitle,
} from "@/lib/leads";
import {
  formatAppointmentRange,
  formatAppointmentStatus,
  type Appointment,
} from "@/lib/appointment-profile";
import {
  formatTaskDueAt,
  formatTaskPriority,
  formatTaskStatus,
  taskPreviewText,
} from "@/lib/task-profile";
import { formatWorkItemStatus } from "@/lib/work-item-profile";
import type {
  Contact,
  Estimate,
  IndustryLabels,
  Invoice,
  Lead,
  Note,
  Payment,
  Task,
  WorkItem,
} from "@/types/api";
import { RecordListEmpty, RecordListItem } from "./contact-record-section";

interface ContactRecordsPanelProps {
  contact: Contact;
  labels: IndustryLabels;
  activeSection: ContactRecordsSectionId;
  leads: Lead[];
  workItems: WorkItem[];
  notes: Note[];
  tasks: Task[];
  appointments?: Appointment[];
  businessTimezone?: string;
  leadsLoading: boolean;
  workItemsLoading: boolean;
  notesLoading: boolean;
  tasksLoading: boolean;
  appointmentsLoading?: boolean;
  canDeleteLead: boolean;
  onCreateLead: () => void;
  onCreateWorkItem: () => void;
  onCreateNote: () => void;
  onCreateTask: () => void;
  onCreateAppointment?: () => void;
  onEditAppointment?: (appointment: Appointment) => void;
  onDeleteAppointment?: (id: string) => void;
  onEditLead: (lead: Lead) => void;
  onDeleteLead: (id: string) => void;
  onEditWorkItem: (item: WorkItem) => void;
  onDeleteWorkItem: (id: string) => void;
  onEditNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onCompleteTask: (id: string) => void;
  onReopenTask: (id: string) => void;
  estimates?: Estimate[];
  invoices?: Invoice[];
  payments?: Payment[];
  financialLoading?: boolean;
  /** Compact section switcher when icon rail is hidden */
  showSectionPicker?: boolean;
  onSectionChange?: (section: ContactRecordsSectionId) => void;
  className?: string;
}

function SectionPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <EmptyState
      compact
      title="Coming soon"
      description={description}
      className="py-10"
    />
  );
}

export function ContactRecordsPanel({
  contact,
  labels,
  activeSection,
  leads,
  workItems,
  notes,
  tasks,
  appointments = [],
  businessTimezone,
  leadsLoading,
  workItemsLoading,
  notesLoading,
  tasksLoading,
  appointmentsLoading = false,
  canDeleteLead,
  onCreateLead,
  onCreateWorkItem,
  onCreateNote,
  onCreateTask,
  onCreateAppointment,
  onEditAppointment,
  onDeleteAppointment,
  onEditLead,
  onDeleteLead,
  onEditWorkItem,
  onDeleteWorkItem,
  onEditNote,
  onDeleteNote,
  onEditTask,
  onDeleteTask,
  onCompleteTask,
  onReopenTask,
  estimates = [],
  invoices = [],
  payments = [],
  financialLoading = false,
  showSectionPicker,
  onSectionChange,
  className,
}: ContactRecordsPanelProps) {
  const timeline = buildContactTimeline(
    contact,
    leads,
    workItems,
    notes,
    tasks,
  );
  const sectionTitle = getRecordsSectionTitle(activeSection, labels);

  const headerAction = (() => {
    if (activeSection === "leads") {
      return (
        <ActionButton onClick={onCreateLead}>
          <Plus className="mr-1 size-3.5" />
          Add
        </ActionButton>
      );
    }
    if (activeSection === "work-items") {
      return (
        <ActionButton onClick={onCreateWorkItem}>
          <Plus className="mr-1 size-3.5" />
          Add
        </ActionButton>
      );
    }
    if (activeSection === "notes") {
      return (
        <ActionButton onClick={onCreateNote}>
          <Plus className="mr-1 size-3.5" />
          Add
        </ActionButton>
      );
    }
    if (activeSection === "tasks") {
      return (
        <ActionButton onClick={onCreateTask}>
          <Plus className="mr-1 size-3.5" />
          Add
        </ActionButton>
      );
    }
    if (activeSection === "appointments" && onCreateAppointment) {
      return (
        <ActionButton onClick={onCreateAppointment}>
          <Plus className="mr-1 size-3.5" />
          Add
        </ActionButton>
      );
    }
    return null;
  })();

  const body = (() => {
    if (isPlaceholderSection(activeSection)) {
      const descriptions: Record<string, string> = {
        appointments: `${labels.appointments} scheduling will appear here.`,
        automations: "Workflows and AI automations are on the roadmap.",
      };
      return (
        <SectionPlaceholder
          title={sectionTitle}
          description={
            descriptions[activeSection] ?? "This module is coming soon."
          }
        />
      );
    }

    switch (activeSection) {
      case "leads":
        if (leadsLoading) return <RecordListEmpty message="Loading…" />;
        if (leads.length === 0) {
          return (
            <EmptyState
              compact
              title="No opportunities yet"
              description="Add a lead to track this contact through your pipeline."
              action={
                <ActionButton onClick={onCreateLead}>
                  <Plus className="mr-1.5 size-4" />
                  Add lead
                </ActionButton>
              }
              className="py-8"
            />
          );
        }
        return (
          <ul className="space-y-2">
            {leads.map((lead) => (
              <li key={lead.id}>
                <RecordListItem
                  title={getLeadDisplayTitle(lead)}
                  meta={`${lead.pipelineStage.name} · ${formatLeadValue(lead.value)}`}
                  onClick={() => onEditLead(lead)}
                  actions={
                    <>
                      <IconButton
                        aria-label="Edit lead"
                        className="size-7"
                        onClick={() => onEditLead(lead)}
                      >
                        <Pencil className="size-3.5" />
                      </IconButton>
                      {canDeleteLead ? (
                        <IconButton
                          aria-label="Delete lead"
                          className="size-7 text-destructive"
                          onClick={() => onDeleteLead(lead.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </IconButton>
                      ) : null}
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        );

      case "work-items":
        if (workItemsLoading) return <RecordListEmpty message="Loading…" />;
        if (workItems.length === 0) {
          return (
            <EmptyState
              compact
              title={`No ${labels.workItems.toLowerCase()} yet`}
              description="Record visits, jobs, or sessions for this contact."
              action={
                <ActionButton onClick={onCreateWorkItem}>
                  <Plus className="mr-1.5 size-4" />
                  Add
                </ActionButton>
              }
              className="py-8"
            />
          );
        }
        return (
          <ul className="space-y-2">
            {workItems.map((item) => (
              <li key={item.id}>
                <RecordListItem
                  title={item.title}
                  meta={`${formatWorkItemStatus(item.status)}${item.scheduledAt ? ` · ${formatContactCreatedAt(item.scheduledAt, businessTimezone)}` : ""}`}
                  onClick={() => onEditWorkItem(item)}
                  actions={
                    <>
                      <IconButton
                        aria-label="Edit work item"
                        className="size-7"
                        onClick={() => onEditWorkItem(item)}
                      >
                        <Pencil className="size-3.5" />
                      </IconButton>
                      <IconButton
                        aria-label="Delete work item"
                        className="size-7 text-destructive"
                        onClick={() => onDeleteWorkItem(item.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </IconButton>
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        );

      case "notes":
        if (notesLoading) return <RecordListEmpty message="Loading…" />;
        if (notes.length === 0) {
          return (
            <EmptyState
              compact
              title="No notes yet"
              description="Capture context and details for this contact."
              action={
                <ActionButton onClick={onCreateNote}>
                  <Plus className="mr-1.5 size-4" />
                  Add note
                </ActionButton>
              }
              className="py-8"
            />
          );
        }
        return (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li key={note.id}>
                <RecordListItem
                  title={note.title}
                  meta={`Updated ${formatContactCreatedAt(note.updatedAt, businessTimezone)}`}
                  onClick={() => onEditNote(note)}
                  actions={
                    <>
                      <IconButton
                        aria-label="Edit note"
                        className="size-7"
                        onClick={() => onEditNote(note)}
                      >
                        <Pencil className="size-3.5" />
                      </IconButton>
                      <IconButton
                        aria-label="Delete note"
                        className="size-7 text-destructive"
                        onClick={() => onDeleteNote(note.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </IconButton>
                    </>
                  }
                />
                <div className="mt-1 px-1">
                  <RichTextPreview
                    html={note.description}
                    className="line-clamp-3 text-xs"
                  />
                </div>
              </li>
            ))}
          </ul>
        );

      case "appointments":
        if (appointmentsLoading) return <RecordListEmpty message="Loading…" />;
        if (appointments.length === 0) {
          return (
            <EmptyState
              compact
              title={`No ${labels.appointments.toLowerCase()} yet`}
              description="Schedule a visit, consultation, or follow-up."
              action={
                onCreateAppointment ? (
                  <ActionButton onClick={onCreateAppointment}>
                    <Plus className="mr-1.5 size-4" />
                    Book appointment
                  </ActionButton>
                ) : undefined
              }
              className="py-8"
            />
          );
        }
        return (
          <ul className="space-y-2">
            {appointments.map((appt) => (
              <li key={appt.id}>
                <RecordListItem
                  title={appt.title}
                  meta={`${formatAppointmentRange(appt.startAt, appt.endAt, businessTimezone)} · ${appt.calendar.name} · ${formatAppointmentStatus(appt.status)}`}
                  onClick={() => onEditAppointment?.(appt)}
                  actions={
                    <>
                      <IconButton
                        aria-label="Edit appointment"
                        className="size-7"
                        onClick={() => onEditAppointment?.(appt)}
                      >
                        <Pencil className="size-3.5" />
                      </IconButton>
                      {onDeleteAppointment ? (
                        <IconButton
                          aria-label="Delete appointment"
                          className="size-7 text-destructive"
                          onClick={() => onDeleteAppointment(appt.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </IconButton>
                      ) : null}
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        );

      case "tasks":
        if (tasksLoading) return <RecordListEmpty message="Loading…" />;
        if (tasks.length === 0) {
          return (
            <EmptyState
              compact
              title="No tasks yet"
              description="Schedule follow-ups with due dates for this contact."
              action={
                <ActionButton onClick={onCreateTask}>
                  <Plus className="mr-1.5 size-4" />
                  Add task
                </ActionButton>
              }
              className="py-8"
            />
          );
        }
        return (
          <ul className="space-y-2">
            {tasks.map((task) => {
              const assignee = task.assignedTo
                ? [task.assignedTo.firstName, task.assignedTo.lastName]
                    .filter(Boolean)
                    .join(" ") || task.assignedTo.email
                : null;
              const metaParts = [
                formatTaskDueAt(task.dueAt),
                formatTaskStatus(task.status),
                task.priority ? formatTaskPriority(task.priority) : null,
                assignee,
              ].filter(Boolean);
              return (
                <li key={task.id}>
                  <RecordListItem
                    title={task.title}
                    meta={metaParts.join(" · ")}
                    onClick={() => onEditTask(task)}
                    actions={
                      <>
                        {task.status !== "COMPLETED" ? (
                          <IconButton
                            aria-label="Mark complete"
                            className="size-7"
                            onClick={() => onCompleteTask(task.id)}
                          >
                            <Check className="size-3.5" />
                          </IconButton>
                        ) : (
                          <IconButton
                            aria-label="Reopen task"
                            className="size-7"
                            onClick={() => onReopenTask(task.id)}
                          >
                            <RotateCcw className="size-3.5" />
                          </IconButton>
                        )}
                        <IconButton
                          aria-label="Edit task"
                          className="size-7"
                          onClick={() => onEditTask(task)}
                        >
                          <Pencil className="size-3.5" />
                        </IconButton>
                        <IconButton
                          aria-label="Delete task"
                          className="size-7 text-destructive"
                          onClick={() => onDeleteTask(task.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </IconButton>
                      </>
                    }
                  />
                  {taskPreviewText(task) ? (
                    <p className="mt-0.5 line-clamp-2 px-1 text-xs text-muted-foreground">
                      {taskPreviewText(task)}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        );

      case "activity":
        if (timeline.length === 0) {
          return (
            <EmptyState
              compact
              title="No activity yet"
              description="Events from leads and work items will appear in this timeline."
              className="py-8"
            />
          );
        }
        return (
          <ul className="space-y-3">
            {timeline.map((event) => (
              <li key={event.id} className="flex gap-2.5 text-sm">
                <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="font-medium leading-snug">{event.title}</p>
                  {event.description ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {event.description}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatContactCreatedAt(event.at, businessTimezone)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        );

      case "estimates":
        return (
          <ContactEstimatesPanel
            contactId={contact.id}
            contactLabel={contact.label}
            estimates={estimates}
            isLoading={financialLoading}
          />
        );

      case "invoices":
        return (
          <ContactInvoicesPanel
            contactId={contact.id}
            contactLabel={contact.label}
            invoices={invoices}
            isLoading={financialLoading}
          />
        );

      case "payments":
        return (
          <ContactPaymentsPanel
            payments={payments}
            isLoading={financialLoading}
          />
        );

      default:
        return null;
    }
  })();

  return (
    <aside
      className={cn(
        WORKSPACE_PANEL_CLASS,
        "w-full min-w-0 max-w-full overflow-hidden",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{sectionTitle}</h2>
          <p className="truncate text-xs text-muted-foreground">
            {contact.label}
          </p>
        </div>
        {headerAction}
      </div>

      {showSectionPicker && onSectionChange ? (
        <div className="shrink-0 border-b border-border/60 px-3 py-2 lg:hidden">
          <select
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-xs"
            value={activeSection}
            onChange={(e) =>
              onSectionChange(e.target.value as ContactRecordsSectionId)
            }
          >
            {CONTACT_RAIL_ITEMS.map((item) => (
              <option key={item.id} value={item.sectionId}>
                {getRecordsSectionTitle(item.sectionId, labels)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
        {body}
      </div>
    </aside>
  );
}
