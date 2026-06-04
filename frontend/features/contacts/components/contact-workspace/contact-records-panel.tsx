"use client";

import { Plus } from "lucide-react";
import { ContactEstimatesPanel } from "@/features/contacts/components/contact-workspace/contact-estimates-panel";
import { ContactInvoicesPanel } from "@/features/contacts/components/contact-workspace/contact-invoices-panel";
import { ContactPaymentsPanel } from "@/features/contacts/components/contact-workspace/contact-payments-panel";
import { ActionButton } from "@/components/ui/action-button";
import { cn } from "@/lib/utils";
import {
  CONTACT_RAIL_ITEMS,
  getRecordsSectionTitle,
  isPlaceholderSection,
  type ContactRecordsSectionId,
  WORKSPACE_PANEL_CLASS,
} from "@/features/contacts/workspace/contact-workspace";
import { ContactRecordsSectionPlaceholder } from "@/features/contacts/workspace/records/contact-records-placeholder";
import { ContactRecordsLeadsSection } from "@/features/contacts/workspace/records/contact-records-leads-section";
import { ContactRecordsWorkItemsSection } from "@/features/contacts/workspace/records/contact-records-work-items-section";
import { ContactRecordsNotesSection } from "@/features/contacts/workspace/records/contact-records-notes-section";
import { ContactRecordsAppointmentsSection } from "@/features/contacts/workspace/records/contact-records-appointments-section";
import { ContactRecordsTasksSection } from "@/features/contacts/workspace/records/contact-records-tasks-section";
import { ContactRecordsActivitySection } from "@/features/contacts/workspace/records/contact-records-activity-section";
import type { ContactRecordsSectionProps } from "@/features/contacts/workspace/records/contact-records-types";

interface ContactRecordsPanelProps extends ContactRecordsSectionProps {
  activeSection: ContactRecordsSectionId;
  showSectionPicker?: boolean;
  onSectionChange?: (section: ContactRecordsSectionId) => void;
  className?: string;
}

function SectionPlaceholder({ description }: { description: string }) {
  return (
    <ContactRecordsSectionPlaceholder
      title="Coming soon"
      description={description}
    />
  );
}

export function ContactRecordsPanel({
  activeSection,
  labels,
  showSectionPicker,
  onSectionChange,
  className,
  ...sectionProps
}: ContactRecordsPanelProps) {
  const props = { labels, ...sectionProps };
  const { contact, onCreateLead, onCreateWorkItem, onCreateNote, onCreateTask, onCreateAppointment } =
    props;

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
          description={
            descriptions[activeSection] ?? "This module is coming soon."
          }
        />
      );
    }

    switch (activeSection) {
      case "leads":
        return <ContactRecordsLeadsSection {...props} />;
      case "work-items":
        return <ContactRecordsWorkItemsSection {...props} />;
      case "notes":
        return <ContactRecordsNotesSection {...props} />;
      case "appointments":
        return <ContactRecordsAppointmentsSection {...props} />;
      case "tasks":
        return <ContactRecordsTasksSection {...props} />;
      case "activity":
        return <ContactRecordsActivitySection {...props} />;
      case "estimates":
        return (
          <ContactEstimatesPanel
            contactId={contact.id}
            contactLabel={contact.label}
            estimates={props.estimates ?? []}
            isLoading={props.financialLoading ?? false}
          />
        );
      case "invoices":
        return (
          <ContactInvoicesPanel
            contactId={contact.id}
            contactLabel={contact.label}
            invoices={props.invoices ?? []}
            isLoading={props.financialLoading ?? false}
          />
        );
      case "payments":
        return (
          <ContactPaymentsPanel
            payments={props.payments ?? []}
            isLoading={props.financialLoading ?? false}
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
