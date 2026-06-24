"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { ActionButton } from "@/components/ui/action-button";
import { IconButton } from "@/components/ui/icon-button";
import { ContactRecordsSectionBody } from "@/features/contacts/components/contact-workspace/contact-records-section-body";
import { ContactSidebarDetailsFields } from "@/features/contacts/components/contact-workspace/contact-sidebar-details-fields";
import {
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
  /** Hide the trash action (e.g. conversations inbox). */
  showDeleteButton?: boolean;
  /** Show edit on avatar hover instead of icon buttons below the name. */
  avatarEditOnHover?: boolean;
  className?: string;
}

export function ContactSidebarPanel({
  contact,
  leads,
  labels,
  activeSection,
  onEdit,
  onDelete,
  showDeleteButton = true,
  avatarEditOnHover = false,
  className,
  ...sectionProps
}: ContactSidebarPanelProps) {
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
      <div
        className={cn(
          "shrink-0 border-b border-border/60 px-4",
          avatarEditOnHover ? "py-2.5" : "py-4",
        )}
      >
        <div
          className={cn(
            "flex gap-3",
            avatarEditOnHover ? "items-center" : "items-start",
          )}
        >
          <div
            className={cn(
              "relative shrink-0",
              avatarEditOnHover && "group size-10",
            )}
          >
            <ProfileAvatar
              name={contact.label}
              avatarUrl={contact.avatarUrl}
              className={avatarEditOnHover ? "size-10" : "size-12"}
              fallbackClassName="bg-primary/10 text-sm font-medium text-primary"
            />
            {avatarEditOnHover ? (
              <button
                type="button"
                onClick={onEdit}
                className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-foreground/55 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                aria-label="Edit contact"
              >
                <Pencil className="size-4 text-background" />
              </button>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold">{contact.label}</h2>
            {!avatarEditOnHover ? (
              <div className="mt-2 flex gap-1">
                <IconButton aria-label="Edit contact" onClick={onEdit}>
                  <Pencil className="size-4" />
                </IconButton>
                {showDeleteButton ? (
                  <IconButton
                    aria-label="Delete contact"
                    className="text-destructive hover:text-destructive"
                    onClick={onDelete}
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-4 py-2.5">
          <h3 className="truncate text-sm font-semibold">{sectionTitle}</h3>
          {activeSection === "profile" ? null : headerAction}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <ContactSidebarDetailsFields contact={contact} />
          {activeSection !== "profile" ? (
            <div className="mt-4 border-t border-border/60 pt-4">
              <ContactRecordsSectionBody
                activeSection={activeSection}
                labels={labels}
                contact={contact}
                leads={leads}
                {...sectionProps}
              />
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
