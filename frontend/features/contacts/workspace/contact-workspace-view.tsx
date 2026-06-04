"use client";

import { EmptyState } from "@/components/data-display/empty-state";
import { ContactActionRail } from "@/features/contacts/components/contact-workspace/contact-action-rail";
import { ContactConversationPanel } from "@/features/contacts/components/contact-workspace/contact-conversation-panel";
import { ContactDetailsPanel } from "@/features/contacts/components/contact-workspace/contact-details-panel";
import { ContactRecordsPanel } from "@/features/contacts/components/contact-workspace/contact-records-panel";
import { ContactWorkspaceColumns } from "@/features/contacts/components/contact-workspace/contact-workspace-columns";
import { ContactWorkspaceShell } from "@/features/contacts/components/contact-workspace/contact-workspace-shell";
import { ContactWorkspaceDialogs } from "@/features/contacts/workspace/contact-workspace-dialogs";
import { ContactWorkspaceMobileTabs } from "@/features/contacts/workspace/contact-workspace-mobile-tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  invalidateContactDetail,
  invalidateContactLists,
  invalidateContactPicker,
} from "@/lib/query/invalidation";
import { WORKSPACE_DESKTOP_ROW_CLASS } from "@/features/contacts/workspace/contact-workspace";
import { useAppRouter } from "@/lib/hooks/use-app-router";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import type { ContactWorkspaceState } from "@/features/contacts/workspace/use-contact-workspace";

export function ContactWorkspaceView(state: ContactWorkspaceState) {
  const router = useAppRouter();
  const queryClient = useQueryClient();
  const {
    contactId,
    business,
    labels,
    contact,
    contactLoading,
    contactError,
    contactTotal,
    canDeleteLead,
    mobilePanel,
    setMobilePanel,
    activeSection,
    setActiveSection,
    handleRailSelect,
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
    completeTaskMutation,
    reopenTaskMutation,
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
    setEditOpen,
    setDeleteContactOpen,
  } = state;

  if (contactLoading) {
    return (
      <ContactWorkspaceShell>
        <div className={cn(WORKSPACE_DESKTOP_ROW_CLASS)}>
          <Skeleton className="h-full min-h-0 rounded-2xl" />
          <Skeleton className="h-full min-h-0 rounded-2xl" />
          <Skeleton className="h-full min-h-0 rounded-2xl" />
          <Skeleton className="h-full min-h-0 rounded-2xl" />
        </div>
      </ContactWorkspaceShell>
    );
  }

  if (contactError || !contact) {
    return (
      <ContactWorkspaceShell className="items-center justify-center p-6">
        <EmptyState
          title="Contact not found"
          description="This contact may have been deleted or you do not have access."
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/business/contacts")}
            >
              Back to contacts
            </Button>
          }
        />
      </ContactWorkspaceShell>
    );
  }

  const lockedContact = { id: contact.id, label: contact.label };

  const recordsPanelProps = {
    contact,
    labels,
    businessTimezone: business?.timezone ?? undefined,
    activeSection,
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
    className: "h-full w-full min-w-0" as const,
  };

  const detailsPanel = (
    <ContactDetailsPanel
      contact={contact}
      leads={leads}
      contactTotal={contactTotal}
      onBack={() => router.push("/business/contacts")}
      onEdit={() => setEditOpen(true)}
      onDelete={() => setDeleteContactOpen(true)}
      className="h-full w-full min-w-0"
    />
  );

  const conversationPanel = (
    <ContactConversationPanel
      contactId={contact.id}
      contactName={contact.label}
      className="h-full w-full min-w-0"
    />
  );

  const onContactEditSuccess = () => {
    void invalidateContactDetail(queryClient, contactId);
    void invalidateContactLists(queryClient);
    void invalidateContactPicker(queryClient);
  };

  return (
    <TooltipProvider>
      <ContactWorkspaceShell>
        <ContactWorkspaceColumns
          details={detailsPanel}
          conversation={conversationPanel}
          records={<ContactRecordsPanel {...recordsPanelProps} />}
          tabletRecords={
            <ContactRecordsPanel
              {...recordsPanelProps}
              showSectionPicker
              onSectionChange={setActiveSection}
            />
          }
          rail={
            <ContactActionRail
              activeSection={activeSection}
              onSelect={handleRailSelect}
              className="h-full w-full min-w-0"
            />
          }
        />

        <ContactWorkspaceMobileTabs
          mobilePanel={mobilePanel}
          onMobilePanelChange={setMobilePanel}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onRailSelect={handleRailSelect}
          detailsPanel={detailsPanel}
          conversationPanel={conversationPanel}
          recordsPanelProps={recordsPanelProps}
        />
      </ContactWorkspaceShell>

      <ContactWorkspaceDialogs
        state={state}
        contact={contact}
        lockedContact={lockedContact}
        onContactDeleted={() => router.push("/business/contacts")}
        onContactEditSuccess={onContactEditSuccess}
      />
    </TooltipProvider>
  );
}
