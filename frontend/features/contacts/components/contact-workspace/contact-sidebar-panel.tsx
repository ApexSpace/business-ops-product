"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActionButton } from "@/components/ui/action-button";
import { IconButton } from "@/components/ui/icon-button";
import { ContactRecordsSectionBody } from "@/features/contacts/components/contact-workspace/contact-records-section-body";
import {
  formatContactAddress,
  formatContactCreatedAt,
  getContactAssigneeFromLeads,
  getRecordsSectionTitle,
  WORKSPACE_PANEL_CLASS,
} from "@/features/contacts/workspace/contact-workspace";
import type { ContactRecordsSectionProps } from "@/features/contacts/workspace/records/contact-records-types";
import type { ContactRecordsSectionId } from "@/features/contacts/workspace/contact-workspace";
import { cn } from "@/lib/utils";

interface ContactSidebarPanelProps extends ContactRecordsSectionProps {
  activeSection: ContactRecordsSectionId;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

interface DetailFieldProps {
  label: string;
  value: string | null | undefined;
}

function SidebarDetailField({ label, value }: DetailFieldProps) {
  const display = value?.trim() ? value.trim() : "—";

  return (
    <div className="space-y-0.5">
      <span className="block text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <p className="text-sm text-foreground">{display}</p>
    </div>
  );
}

export function ContactSidebarPanel({
  contact,
  leads,
  labels,
  activeSection,
  onEdit,
  onDelete,
  className,
  ...sectionProps
}: ContactSidebarPanelProps) {
  const assignee = getContactAssigneeFromLeads(leads);
  const address = formatContactAddress(contact);
  const sectionTitle = getRecordsSectionTitle(activeSection, labels);
  const {
    onCreateLead,
    onCreateWorkItem,
    onCreateNote,
    onCreateTask,
    onCreateAppointment,
  } = sectionProps;

  const headerAction = (() => {
    if (activeSection === "leads" && onCreateLead) {
      return (
        <ActionButton size="sm" onClick={onCreateLead}>
          <Plus className="mr-1 size-3.5" />
          Add
        </ActionButton>
      );
    }
    if (activeSection === "work-items" && onCreateWorkItem) {
      return (
        <ActionButton size="sm" onClick={onCreateWorkItem}>
          <Plus className="mr-1 size-3.5" />
          Add
        </ActionButton>
      );
    }
    if (activeSection === "notes" && onCreateNote) {
      return (
        <ActionButton size="sm" onClick={onCreateNote}>
          <Plus className="mr-1 size-3.5" />
          Add
        </ActionButton>
      );
    }
    if (activeSection === "tasks" && onCreateTask) {
      return (
        <ActionButton size="sm" onClick={onCreateTask}>
          <Plus className="mr-1 size-3.5" />
          Add
        </ActionButton>
      );
    }
    if (activeSection === "appointments" && onCreateAppointment) {
      return (
        <ActionButton size="sm" onClick={onCreateAppointment}>
          <Plus className="mr-1 size-3.5" />
          Add
        </ActionButton>
      );
    }
    return null;
  })();

  return (
    <aside className={cn(WORKSPACE_PANEL_CLASS, className)}>
      <div className="shrink-0 border-b border-border/60 px-4 py-4">
        <div className="flex items-start gap-3">
          <Avatar className="size-12 shrink-0">
            {contact.avatarUrl ? (
              <AvatarImage src={contact.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
              {contact.label.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold">{contact.label}</h2>
            <div className="mt-2 flex gap-1">
              <IconButton aria-label="Edit contact" onClick={onEdit}>
                <Pencil className="size-4" />
              </IconButton>
              <IconButton
                aria-label="Delete contact"
                className="text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="size-4" />
              </IconButton>
            </div>
          </div>
        </div>
      </div>

      <div className="max-h-[42%] shrink-0 overflow-y-auto border-b border-border/60 px-4 py-3">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Contact details
        </h3>
        <div className="space-y-3">
          <SidebarDetailField label="Email" value={contact.email} />
          <SidebarDetailField label="Phone" value={contact.phone} />
          <SidebarDetailField label="Company" value={contact.companyName} />
          <SidebarDetailField label="Address" value={address} />
          <SidebarDetailField label="Timezone" value={contact.timezone} />
          <SidebarDetailField label="Source" value={contact.source} />
          <SidebarDetailField
            label="Created"
            value={formatContactCreatedAt(contact.createdAt)}
          />
          <SidebarDetailField label="Owner" value={assignee ?? "Unassigned"} />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-4 py-2.5">
          <h3 className="truncate text-sm font-semibold">{sectionTitle}</h3>
          {headerAction}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <ContactRecordsSectionBody
            activeSection={activeSection}
            labels={labels}
            contact={contact}
            leads={leads}
            {...sectionProps}
          />
        </div>
      </div>
    </aside>
  );
}
