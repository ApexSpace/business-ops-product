"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { LoadingState } from "@/components/data-display/loading-state";
import { EntityDetailTabs } from "@/components/layout/entity-detail-tabs";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { ContactDrawerProfilePanel } from "@/features/contacts/components/contact-drawer-profile-panel";
import { ContactProfileEditForm } from "@/features/contacts/components/contact-profile-edit-form";
import { ContactSidebarDetailsFields } from "@/features/contacts/components/contact-workspace/contact-sidebar-details-fields";
import { ContactRecordsSectionBody } from "@/features/contacts/components/contact-workspace/contact-records-section-body";
import { useContactDetailPanel } from "@/features/contacts/hooks/use-contact-detail-panel";
import { useContactStaffPermissions } from "@/features/contacts/hooks/use-contact-staff-permissions";
import { ContactWorkspaceDialogs } from "@/features/contacts/workspace/contact-workspace-dialogs";
import { openContactPrintAppointments } from "@/features/contacts/utils/contact-print";
import { formatContactCreatedAt } from "@/features/contacts/workspace/contact-workspace";
import type { ContactRecordsSectionId } from "@/features/contacts/workspace/contact-workspace";
import {
  invalidateContactDetail,
  invalidateContactLists,
  invalidateContactPicker,
} from "@/lib/query/invalidation";
import { cn } from "@/lib/utils";
import {
  CONTACTS_DRAWER_PROFILE_COL_CLASS,
  CONTACTS_DRAWER_RECORDS_CLASS,
  CONTACTS_DRAWER_SPLIT_CLASS,
  CONTACTS_DRAWER_TABPANEL_CLASS,
  CONTACTS_DRAWER_TABPANEL_TIMELINE_CLASS,
  CONTACTS_DRAWER_TAB_SCROLL_CLASS,
} from "@/features/contacts/styles/contacts-drawer-tokens";
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

export const CONTACT_DETAIL_DRAWER_TABS = CONTACT_DETAIL_TABS.map((tab) => ({
  value: tab.id,
  label: tab.label,
}));

type ContactDetailTabId = (typeof CONTACT_DETAIL_TABS)[number]["id"];

function ContactRecordsTabs({
  activeSection,
  onSectionChange,
}: {
  activeSection: ContactDetailTabId;
  onSectionChange: (section: ContactDetailTabId) => void;
}) {
  return (
    <EntityDetailTabs
      variant="panel"
      value={activeSection}
      onValueChange={(value) => {
        if (isContactDetailTab(value)) onSectionChange(value);
      }}
      tabs={CONTACT_DETAIL_DRAWER_TABS}
      aria-label="Contact records"
    />
  );
}

export function isContactDetailTab(
  value: string,
): value is ContactDetailTabId {
  return CONTACT_DETAIL_TABS.some((tab) => tab.id === value);
}

export interface ContactDetailPanelActions {
  openEdit: () => void;
  openDelete: () => void;
  openCreateNote: () => void;
  printAppointments: () => void;
}

interface ContactDetailPanelProps {
  contactId: string;
  activeSection: ContactDetailTabId;
  onSectionChange: (section: ContactDetailTabId) => void;
  onContactDeleted: () => void;
  /** Page = split workspace; drawer = narrow slide-in panel. */
  variant?: "page" | "drawer";
  /** Body only for EntityDetailDrawer (no aside chrome or tab bar). */
  embedded?: boolean;
  onActionsReady?: (actions: ContactDetailPanelActions) => void;
  noteComposerOpen?: boolean;
  onNoteComposerOpenChange?: (open: boolean) => void;
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
        <LoadingState variant="skeleton" rows={3} />
      </aside>
      <div className="contacts-records-card">
        <LoadingState variant="skeleton" rows={5} />
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
  embedded = false,
  onActionsReady,
  noteComposerOpen = false,
  onNoteComposerOpenChange,
  className,
}: ContactDetailPanelProps) {
  const queryClient = useQueryClient();
  const contactPerms = useContactStaffPermissions();
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
    editOpen,
  } = state;

  useEffect(() => {
    if (!embedded || !onActionsReady || !contact) return;
    onActionsReady({
      openEdit: () => setEditOpen(true),
      openDelete: () => setDeleteContactOpen(true),
      openCreateNote: () => {
        onNoteComposerOpenChange?.(true);
      },
      printAppointments: () => openContactPrintAppointments(contact.id),
    });
  }, [
    contact,
    embedded,
    onActionsReady,
    onNoteComposerOpenChange,
    setDeleteContactOpen,
    setEditOpen,
  ]);

  if (contactLoading) {
    if (embedded) return null;
    return <ContactDetailPanelLoading className={className} variant={variant} />;
  }

  if (contactError || !contact) {
    if (embedded) {
      return (
        <ApiErrorState
          compact
          error={contactError}
          title="Could not load this contact"
        />
      );
    }
    return (
      <section
        className={cn(
          "contacts-panel-card contacts-detail-empty",
          className,
        )}
      >
        <ApiErrorState
          compact
          error={contactError}
          title="Could not load this contact"
        />
      </section>
    );
  }

  const lockedContact = { id: contact.id, label: contact.label,
};
  const createdAt = formatContactCreatedAt(contact.createdAt, business?.timezone ?? undefined);
  const isDrawer = variant === "drawer";
  const onContactEditSuccess = () => {
    setEditOpen(false);
    void invalidateContactDetail(queryClient, contact.id);
    void invalidateContactLists(queryClient);
    void invalidateContactPicker(queryClient);
  };
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
    onCreateNote: embedded
      ? () => onNoteComposerOpenChange?.(true)
      : () => setCreateNoteOpen(true),
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

  if (embedded) {
    return (
      <>
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          <div className={CONTACTS_DRAWER_SPLIT_CLASS}>
            {editOpen ? (
              <ContactProfileEditForm
                contact={contact}
                onCancel={() => setEditOpen(false)}
                onSuccess={onContactEditSuccess}
                className={CONTACTS_DRAWER_PROFILE_COL_CLASS}
              />
            ) : (
              <ContactDrawerProfilePanel
                contact={contact}
                contactId={contact.id}
                onEdit={() => setEditOpen(true)}
                showEditButton={contactPerms.canManage}
                showContactDetails={contactPerms.canViewContactDetails}
                noteComposerOpen={noteComposerOpen}
                onNoteComposerOpenChange={onNoteComposerOpenChange}
              />
            )}
            <div className={CONTACTS_DRAWER_RECORDS_CLASS}>
              <ContactRecordsTabs
                activeSection={activeSection}
                onSectionChange={onSectionChange}
              />
              <div
                className={cn(
                  CONTACTS_DRAWER_TABPANEL_CLASS,
                  activeSection === "timeline" &&
                    CONTACTS_DRAWER_TABPANEL_TIMELINE_CLASS,
                )}
              >
                {activeSection === "timeline" ? (
                  <ContactRecordsSectionBody
                    activeSection={activeSection}
                    {...recordsPanelProps}
                  />
                ) : (
                  <div className={CONTACTS_DRAWER_TAB_SCROLL_CLASS}>
                    <ContactRecordsSectionBody
                      activeSection={activeSection}
                      {...recordsPanelProps}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <ContactWorkspaceDialogs
          state={state}
          contact={contact}
          lockedContact={lockedContact}
          onContactDeleted={onContactDeleted}
          useInlineNoteCreate
          useInlineContactEdit
          onContactEditSuccess={onContactEditSuccess}
        />
      </>
    );
  }

  return (
    <>
      <div className={rootClassName}>
        {editOpen ? (
          <ContactProfileEditForm
            contact={contact}
            onCancel={() => setEditOpen(false)}
            onSuccess={onContactEditSuccess}
            className="contacts-profile-card"
          />
        ) : (
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
                {contactPerms.canManage || contactPerms.canDeleteMerge ? (
                  <div className="contacts-profile-actions">
                    {contactPerms.canManage ? (
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
                    ) : null}
                    {contactPerms.canDeleteMerge ? (
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
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="contacts-profile-facts">
            <ContactSidebarDetailsFields
              contact={contact}
              showNotes={false}
              showCreated
              createdAt={createdAt}
              showPhone={contactPerms.canViewContactDetails}
              showEmail={contactPerms.canViewContactDetails}
              onRequestEdit={
                contactPerms.canManage ? () => setEditOpen(true) : undefined
              }
            />
          </div>

          <div className="contacts-profile-notes">
            <ContactSidebarDetailsFields
              contact={contact}
              showPhone={false}
              showEmail={false}
              showCreated={false}
              onRequestEdit={
                contactPerms.canManage ? () => setEditOpen(true) : undefined
              }
              notesTextareaClassName="!min-h-[72px] max-h-40 resize-y focus:!min-h-[96px]"
            />
          </div>
        </aside>
        )}

        <div className="contacts-records-card">
          <ContactRecordsTabs
            activeSection={activeSection}
            onSectionChange={onSectionChange}
          />

          <div className="contacts-d2-tabpanel" role="tabpanel">
            <ContactRecordsSectionBody
              activeSection={activeSection}
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
        useInlineContactEdit
        onContactEditSuccess={onContactEditSuccess}
      />
    </>
  );
}

export type { ContactDetailTabId };
