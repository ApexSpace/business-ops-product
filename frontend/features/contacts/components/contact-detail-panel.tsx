"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactSidebarDetailsFields } from "@/features/contacts/components/contact-workspace/contact-sidebar-details-fields";
import { ContactRecordsSectionBody } from "@/features/contacts/components/contact-workspace/contact-records-section-body";
import { useContactDetailPanel } from "@/features/contacts/hooks/use-contact-detail-panel";
import { ContactWorkspaceDialogs } from "@/features/contacts/workspace/contact-workspace-dialogs";
import { formatContactCreatedAt } from "@/features/contacts/workspace/contact-workspace";
import type { ContactRecordsSectionId } from "@/features/contacts/workspace/contact-workspace";
import {
  invalidateContactDetail,
  invalidateContactLists,
  invalidateContactPicker,
} from "@/lib/query/invalidation";
import { cn } from "@/lib/utils";
import "@/features/contacts/styles/contacts-split-layout.css";

const CONTACT_DETAIL_TABS = [
  { id: "timeline", label: "Timeline" },
  { id: "wallet", label: "Wallet" },
  { id: "memberships", label: "Memberships & Packages" },
  { id: "adjustments", label: "Adjustments" },
] as const satisfies ReadonlyArray<{
  id: ContactRecordsSectionId;
  label: string;
}>;

type ContactDetailTabId = (typeof CONTACT_DETAIL_TABS)[number]["id"];

interface ContactDetailPanelProps {
  contactId: string;
  activeSection: ContactDetailTabId;
  onSectionChange: (section: ContactDetailTabId) => void;
  onContactDeleted: () => void;
  /** Page = split workspace; drawer = narrow slide-in panel. */
  variant?: "page" | "drawer";
  className?: string;
}

function ContactDetailPanelLoading({
  className,
  variant = "page",
}: Pick<ContactDetailPanelProps, "className" | "variant">) {
  const isDrawer = variant === "drawer";
  return (
    <div
      className={cn(
        isDrawer
          ? "contacts-detail-card contacts-detail-card--drawer"
          : "contacts-panel-card contacts-detail-card",
        className,
      )}
    >
      <aside className="contacts-profile-card">
        <div className="contacts-profile-identity">
          <div className="flex items-center gap-3">
            <Skeleton className="size-16 shrink-0 rounded-full" />
            <Skeleton className="h-5 w-32 flex-1" />
          </div>
          <div className="contacts-profile-actions mt-2 flex w-16 justify-center">
            <Skeleton className="size-8 rounded-[var(--radius-control)]" />
            <Skeleton className="size-8 rounded-[var(--radius-control)]" />
          </div>
        </div>
      </aside>
      <div className="contacts-records-card">
        <Skeleton className="mb-5 h-8 w-full" />
        <Skeleton className="mb-4 h-10 w-80 rounded-full" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function ContactDetailPanel({
  contactId,
  activeSection,
  onSectionChange,
  onContactDeleted,
  variant = "page",
  className,
}: ContactDetailPanelProps) {
  const queryClient = useQueryClient();
  const state = useContactDetailPanel(contactId, activeSection);
  const {
    business,
    labels,
    contact,
    contactLoading,
    contactError,
    leads,
    workItems,
    notes,
    tasks,
    appointments,
    leadsLoading,
    workItemsLoading,
    notesLoading,
    tasksLoading,
    appointmentsLoading,
    estimates,
    invoices,
    payments,
    isLoading: financialLoading,
    canDeleteLead,
    setCreateLeadOpen,
    setCreateWorkItemOpen,
    setCreateNoteOpen,
    setCreateTaskOpen,
    setCreateAppointmentOpen,
    setEditingAppointment,
    setDeleteAppointmentId,
    setEditingLead,
    setDeleteLeadId,
    setEditingWorkItem,
    setDeleteWorkItemId,
    setEditingNote,
    setDeleteNoteId,
    setEditingTask,
    setDeleteTaskId,
    completeTaskMutation,
    reopenTaskMutation,
    setEditOpen,
    setDeleteContactOpen,
  } = state;

  if (contactLoading) {
    return <ContactDetailPanelLoading className={className} variant={variant} />;
  }

  if (contactError || !contact) {
    return (
      <section
        className={cn(
          "contacts-panel-card contacts-detail-empty",
          className,
        )}
      >
        <ApiErrorState
          compact
          title="Could not load this contact"
          description="Try selecting the contact again or refresh the list."
        />
      </section>
    );
  }

  const lockedContact = { id: contact.id, label: contact.label };
  const createdAt = formatContactCreatedAt(contact.createdAt, business?.timezone ?? undefined);
  const isDrawer = variant === "drawer";
  const rootClassName = cn(
    isDrawer
      ? "contacts-detail-card contacts-detail-card--drawer"
      : "contacts-panel-card contacts-detail-card",
    className,
  );
  const recordsPanelProps = {
    contact,
    labels,
    businessTimezone: business?.timezone ?? undefined,
    leads,
    workItems,
    notes,
    tasks,
    appointments,
    leadsLoading,
    workItemsLoading,
    notesLoading,
    tasksLoading,
    appointmentsLoading,
    canDeleteLead,
    onCreateLead: () => setCreateLeadOpen(true),
    onCreateWorkItem: () => setCreateWorkItemOpen(true),
    onCreateNote: () => setCreateNoteOpen(true),
    onCreateTask: () => setCreateTaskOpen(true),
    onCreateAppointment: () => setCreateAppointmentOpen(true),
    onEditAppointment: setEditingAppointment,
    onDeleteAppointment: setDeleteAppointmentId,
    onEditLead: setEditingLead,
    onDeleteLead: setDeleteLeadId,
    onEditWorkItem: setEditingWorkItem,
    onDeleteWorkItem: setDeleteWorkItemId,
    onEditNote: setEditingNote,
    onDeleteNote: setDeleteNoteId,
    onEditTask: setEditingTask,
    onDeleteTask: setDeleteTaskId,
    onCompleteTask: (taskId: string) => completeTaskMutation.mutate(taskId),
    onReopenTask: (taskId: string) => reopenTaskMutation.mutate(taskId),
    estimates,
    invoices,
    payments,
    financialLoading,
  };

  return (
    <>
      <div className={rootClassName}>
        <aside className="contacts-profile-card">
          <div className="contacts-profile-identity">
            <div className="flex items-center gap-3">
              <ProfileAvatar
                name={contact.label}
                avatarUrl={contact.avatarAssetId ? contact.avatarUrl : null}
                size="lg"
                className="!size-16 shrink-0 ring-1 ring-border"
                fallbackClassName="bg-primary/10 text-sm font-semibold text-primary"
              />
              <h2 className="min-w-0 flex-1 text-lg font-semibold leading-snug">
                {contact.label}
              </h2>
            </div>
            <div className="mt-2 flex">
              <div className="flex w-16 shrink-0 justify-center gap-1.5">
                <div className="contacts-profile-actions">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="size-8"
                    onClick={() => setEditOpen(true)}
                    aria-label="Edit contact"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="size-8 text-destructive hover:bg-destructive/5 hover:text-destructive"
                    onClick={() => setDeleteContactOpen(true)}
                    aria-label="Delete contact"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="contacts-profile-facts">
            <ContactSidebarDetailsFields
              contact={contact}
              showNotes={false}
              showCreated
              createdAt={createdAt}
              onRequestEdit={() => setEditOpen(true)}
            />
          </div>

          <div className="contacts-profile-notes">
            <ContactSidebarDetailsFields
              contact={contact}
              showPhone={false}
              showEmail={false}
              showCreated={false}
              onRequestEdit={() => setEditOpen(true)}
              notesTextareaClassName="!min-h-[72px] max-h-40 resize-y focus:!min-h-[96px]"
            />
          </div>
        </aside>

        <div className="contacts-records-card">
          <div className="contacts-d2-tabbar-wrap">
            <div className="contacts-d2-tabbar" role="tablist" aria-label="Contact records">
              {CONTACT_DETAIL_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeSection === tab.id}
                  className={cn(
                    "contacts-d2-tab text-sm font-medium",
                    activeSection === tab.id && "active",
                  )}
                  onClick={() => onSectionChange(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="contacts-d2-tabpanel" role="tabpanel">
            <ContactRecordsSectionBody
              activeSection={activeSection}
              labels={labels}
              {...recordsPanelProps}
            />
          </div>
        </div>
      </div>

      <ContactWorkspaceDialogs
        state={state}
        contact={contact}
        lockedContact={lockedContact}
        onContactDeleted={onContactDeleted}
        onContactEditSuccess={() => {
          void invalidateContactDetail(queryClient, contact.id);
          void invalidateContactLists(queryClient);
          void invalidateContactPicker(queryClient);
        }}
      />
    </>
  );
}

export type { ContactDetailTabId };
