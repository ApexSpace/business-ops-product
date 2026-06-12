"use client";

import { Plus } from "lucide-react";
import { ContactRecordsSectionBody } from "@/features/contacts/components/contact-workspace/contact-records-section-body";
import { ActionButton } from "@/components/ui/action-button";
import { cn } from "@/lib/utils";
import {
  CONTACT_RAIL_ITEMS,
  getRecordsSectionTitle,
  type ContactRecordsSectionId,
  WORKSPACE_PANEL_CLASS,
} from "@/features/contacts/workspace/contact-workspace";
import type { ContactRecordsSectionProps } from "@/features/contacts/workspace/records/contact-records-types";

interface ContactRecordsPanelProps extends ContactRecordsSectionProps {
  activeSection: ContactRecordsSectionId;
  showSectionPicker?: boolean;
  onSectionChange?: (section: ContactRecordsSectionId) => void;
  className?: string;
}

export function ContactRecordsPanel({
  activeSection,
  labels,
  showSectionPicker,
  onSectionChange,
  className,
  ...sectionProps
}: ContactRecordsPanelProps) {
  const { contact, onCreateLead, onCreateWorkItem, onCreateNote, onCreateTask, onCreateAppointment } =
    sectionProps;

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
        <ContactRecordsSectionBody
          activeSection={activeSection}
          labels={labels}
          {...sectionProps}
        />
      </div>
    </aside>
  );
}
