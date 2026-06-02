"use client";

import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ContactFormDialog } from "@/components/contacts/contact-form-dialog";
import { ContactActionRail } from "@/components/contacts/contact-workspace/contact-action-rail";
import { ContactConversationPanel } from "@/components/contacts/contact-workspace/contact-conversation-panel";
import { ContactDetailsPanel } from "@/components/contacts/contact-workspace/contact-details-panel";
import { ContactRecordsPanel } from "@/components/contacts/contact-workspace/contact-records-panel";
import { ContactWorkspaceColumns } from "@/components/contacts/contact-workspace/contact-workspace-columns";
import { ContactWorkspaceShell } from "@/components/contacts/contact-workspace/contact-workspace-shell";
import { CreateLeadDialog } from "@/components/leads/create-lead-dialog";
import { LeadFormDialog } from "@/components/leads/lead-form-dialog";
import { EmptyState } from "@/components/data-display/empty-state";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { NoteFormDialog } from "@/components/notes/note-form-dialog";
import { AppointmentFormDialog } from "@/components/appointments/appointment-form-dialog";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { WorkItemFormDialog } from "@/components/work-items/work-item-form-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getIndustryLabels } from "@/config/industry-labels";
import { useContactFinancialRecords } from "@/hooks/use-contact-financial-records";
import { useAppRouter } from "@/hooks/use-app-router";
import { apiClient } from "@/lib/api-client";
import {
  DEFAULT_CONTACT_RECORDS_SECTION,
  WORKSPACE_DESKTOP_ROW_CLASS,
  WORKSPACE_PADDING_CLASS,
  type ContactMobilePanel,
  type ContactRailItem,
  type ContactRecordsSectionId,
} from "@/lib/contact-workspace";
import { isContactFinancialSection } from "@/lib/contact-financial";
import {
  invalidateContactDetail,
  invalidateContactLists,
  invalidateContactPicker,
  invalidateLeadLists,
  invalidateNoteLists,
  invalidatePipelines,
  invalidateTaskLists,
  invalidateWorkItemLists,
} from "@/lib/query-invalidation";
import { queryKeys } from "@/lib/query-keys";
import { useSetPageMetadata } from "@/lib/page-metadata-context";
import { canInviteMember } from "@/lib/permissions";
import { useAuth } from "@/lib/auth-provider";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/lib/appointment-profile";
import type {
  Business,
  Contact,
  Lead,
  Note,
  PaginatedResult,
  Task,
  WorkItem,
} from "@/types/api";

const RELATED_LIMIT = 100;

function ContactWorkspacePageContent() {
  const { id } = useParams<{ id: string }>();
  const router = useAppRouter();
  const queryClient = useQueryClient();
  const { jwt, contexts } = useAuth();
  const canDeleteLead = canInviteMember(jwt, contexts);
  const setPageMetadata = useSetPageMetadata();

  const [mobilePanel, setMobilePanel] =
    useState<ContactMobilePanel>("conversation");
  const [activeSection, setActiveSection] = useState<ContactRecordsSectionId>(
    DEFAULT_CONTACT_RECORDS_SECTION,
  );
  const [editOpen, setEditOpen] = useState(false);
  const [deleteContactOpen, setDeleteContactOpen] = useState(false);
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [createWorkItemOpen, setCreateWorkItemOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editingWorkItem, setEditingWorkItem] = useState<WorkItem | null>(null);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [deleteWorkItemId, setDeleteWorkItemId] = useState<string | null>(null);
  const [createNoteOpen, setCreateNoteOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [createAppointmentOpen, setCreateAppointmentOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(
    null,
  );
  const [deleteAppointmentId, setDeleteAppointmentId] = useState<string | null>(
    null,
  );

  const { data: business } = useQuery({
    queryKey: queryKeys.business.current(),
    queryFn: () => apiClient<Business>("businesses/current"),
  });
  const labels = getIndustryLabels(business?.industry);

  const { data: contactsList } = useQuery({
    queryKey: queryKeys.contacts.list({ page: 1, limit: 1 }),
    queryFn: () =>
      apiClient<PaginatedResult<Contact>>("contacts", {
        searchParams: { page: 1, limit: 1 },
      }),
  });

  const {
    data: contact,
    isLoading: contactLoading,
    isError: contactError,
  } = useQuery({
    queryKey: queryKeys.contacts.detail(id),
    queryFn: () => apiClient<Contact>(`contacts/${id}`),
  });

  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: queryKeys.leads.list({
      contactId: id,
      page: 1,
      limit: RELATED_LIMIT,
    }),
    queryFn: () =>
      apiClient<PaginatedResult<Lead>>("leads", {
        searchParams: { page: 1, limit: RELATED_LIMIT, contactId: id },
      }),
    enabled: !!id,
  });

  const { data: workItemsData, isLoading: workItemsLoading } = useQuery({
    queryKey: queryKeys.workItems.list({
      contactId: id,
      page: 1,
      limit: RELATED_LIMIT,
    }),
    queryFn: () =>
      apiClient<PaginatedResult<WorkItem>>("work-items", {
        searchParams: { page: 1, limit: RELATED_LIMIT, contactId: id },
      }),
    enabled: !!id,
  });

  const { data: notesData, isLoading: notesLoading } = useQuery({
    queryKey: queryKeys.notes.list({
      contactId: id,
      page: 1,
      limit: RELATED_LIMIT,
    }),
    queryFn: () =>
      apiClient<PaginatedResult<Note>>("notes", {
        searchParams: { page: 1, limit: RELATED_LIMIT, contactId: id },
      }),
    enabled: !!id,
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: queryKeys.tasks.list({
      contactId: id,
      page: 1,
      limit: RELATED_LIMIT,
    }),
    queryFn: () =>
      apiClient<PaginatedResult<Task>>("tasks", {
        searchParams: { page: 1, limit: RELATED_LIMIT, contactId: id },
      }),
    enabled: !!id,
  });

  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: queryKeys.appointments.list({
      contactId: id,
      page: 1,
      limit: RELATED_LIMIT,
    }),
    queryFn: () =>
      apiClient<PaginatedResult<Appointment>>("appointments", {
        searchParams: { page: 1, limit: RELATED_LIMIT, contactId: id },
      }),
    enabled: !!id,
  });

  const leads = leadsData?.items ?? [];
  const workItems = workItemsData?.items ?? [];
  const notes = notesData?.items ?? [];
  const tasks = tasksData?.items ?? [];
  const appointments = appointmentsData?.items ?? [];

  const isFinancialSection = isContactFinancialSection(activeSection);
  const {
    estimates,
    invoices,
    payments,
    isLoading: financialLoading,
  } = useContactFinancialRecords(id, isFinancialSection);

  useEffect(() => {
    if (!contact) return;
    setPageMetadata({
      title: contact.label,
      breadcrumbs: [
        { label: labels.contacts, href: "/business/contacts" },
        { label: contact.label },
      ],
    });
  }, [contact, setPageMetadata, labels.contacts]);

  const refreshContactData = () => {
    void invalidateContactDetail(queryClient, id);
    void invalidateLeadLists(queryClient);
    void invalidateWorkItemLists(queryClient);
    void invalidateNoteLists(queryClient);
    void invalidateTaskLists(queryClient);
    void invalidatePipelines(queryClient);
    void queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all() });
  };

  const deleteContactMutation = useMutation({
    mutationFn: () =>
      apiClient(`contacts/${id}`, {
        method: "DELETE",
        searchParams: { confirm: true },
      }),
    onSuccess: () => {
      toast.success("Contact deleted");
      void invalidateContactLists(queryClient);
      void invalidateContactPicker(queryClient);
      router.push("/business/contacts");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (leadId: string) =>
      apiClient(`leads/${leadId}`, {
        method: "DELETE",
        searchParams: { confirm: true },
      }),
    onSuccess: () => {
      toast.success("Lead deleted");
      refreshContactData();
      setDeleteLeadId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteWorkItemMutation = useMutation({
    mutationFn: (workItemId: string) =>
      apiClient(`work-items/${workItemId}`, {
        method: "DELETE",
        searchParams: { confirm: true },
      }),
    onSuccess: () => {
      toast.success("Work item deleted");
      refreshContactData();
      setDeleteWorkItemId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) =>
      apiClient(`notes/${noteId}`, {
        method: "DELETE",
        searchParams: { confirm: true },
      }),
    onSuccess: () => {
      toast.success("Note deleted");
      refreshContactData();
      setDeleteNoteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) =>
      apiClient(`tasks/${taskId}`, {
        method: "DELETE",
        searchParams: { confirm: true },
      }),
    onSuccess: () => {
      toast.success("Task deleted");
      refreshContactData();
      setDeleteTaskId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const completeTaskMutation = useMutation({
    mutationFn: (taskId: string) =>
      apiClient(`tasks/${taskId}/complete`, { method: "PATCH" }),
    onSuccess: () => {
      toast.success("Task completed");
      refreshContactData();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reopenTaskMutation = useMutation({
    mutationFn: (taskId: string) =>
      apiClient(`tasks/${taskId}/reopen`, { method: "PATCH" }),
    onSuccess: () => {
      toast.success("Task reopened");
      refreshContactData();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: (appointmentId: string) =>
      apiClient(`appointments/${appointmentId}`, {
        method: "DELETE",
        searchParams: { confirm: true },
      }),
    onSuccess: () => {
      toast.success("Appointment deleted");
      refreshContactData();
      setDeleteAppointmentId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleRailSelect = (item: ContactRailItem) => {
    setActiveSection(item.sectionId);
    setMobilePanel("records");
  };

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
  const contactTotal = contactsList?.meta.total;

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

  const recordsPanel = <ContactRecordsPanel {...recordsPanelProps} />;

  const recordsPanelTablet = (
    <ContactRecordsPanel
      {...recordsPanelProps}
      showSectionPicker
      onSectionChange={setActiveSection}
    />
  );

  const actionRail = (
    <ContactActionRail
      activeSection={activeSection}
      onSelect={handleRailSelect}
      className="h-full w-full min-w-0"
    />
  );

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
      contactName={contact.label}
      className="h-full w-full min-w-0"
    />
  );

  return (
    <TooltipProvider>
      <ContactWorkspaceShell>
        <ContactWorkspaceColumns
          details={detailsPanel}
          conversation={conversationPanel}
          records={recordsPanel}
          tabletRecords={recordsPanelTablet}
          rail={actionRail}
        />

        {/* Mobile: tabbed panels */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:hidden xl:hidden">
          <Tabs
            value={mobilePanel}
            onValueChange={(v) => setMobilePanel(v as ContactMobilePanel)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <TabsList className="mx-2 mt-2 grid h-10 shrink-0 grid-cols-4 px-0 sm:mx-2.5">
              <TabsTrigger value="details" className="text-xs">
                Details
              </TabsTrigger>
              <TabsTrigger value="conversation" className="text-xs">
                Messages
              </TabsTrigger>
              <TabsTrigger value="records" className="text-xs">
                Records
              </TabsTrigger>
              <TabsTrigger value="actions" className="text-xs">
                Actions
              </TabsTrigger>
            </TabsList>
            <TabsContent
              value="details"
              className={cn(
                "mt-0 min-h-0 flex-1 overflow-hidden pb-2",
                WORKSPACE_PADDING_CLASS,
              )}
            >
              {detailsPanel}
            </TabsContent>
            <TabsContent
              value="conversation"
              className={cn(
                "mt-0 min-h-0 flex-1 overflow-hidden pb-2",
                WORKSPACE_PADDING_CLASS,
              )}
            >
              {conversationPanel}
            </TabsContent>
            <TabsContent
              value="records"
              className={cn(
                "mt-0 min-h-0 flex-1 overflow-hidden pb-2",
                WORKSPACE_PADDING_CLASS,
              )}
            >
              <ContactRecordsPanel
                {...recordsPanelProps}
                showSectionPicker
                onSectionChange={setActiveSection}
              />
            </TabsContent>
            <TabsContent
              value="actions"
              className={cn(
                "mt-0 min-h-0 flex-1 overflow-hidden pb-2",
                WORKSPACE_PADDING_CLASS,
              )}
            >
              <ContactActionRail
                layout="grid"
                className="h-full"
                activeSection={activeSection}
                onSelect={handleRailSelect}
              />
            </TabsContent>
          </Tabs>
        </div>
      </ContactWorkspaceShell>

      <ContactFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        contact={contact}
        onSuccess={() => {
          void invalidateContactDetail(queryClient, id);
          void invalidateContactLists(queryClient);
          void invalidateContactPicker(queryClient);
        }}
      />

      <CreateLeadDialog
        open={createLeadOpen}
        onOpenChange={setCreateLeadOpen}
        defaultContactId={lockedContact.id}
        defaultContactLabel={lockedContact.label}
        onSuccess={refreshContactData}
      />

      <LeadFormDialog
        open={!!editingLead}
        onOpenChange={(open) => !open && setEditingLead(null)}
        lead={editingLead}
        onSuccess={() => {
          setEditingLead(null);
          refreshContactData();
        }}
      />

      <WorkItemFormDialog
        open={createWorkItemOpen || !!editingWorkItem}
        onOpenChange={(open) => {
          if (!open) {
            setCreateWorkItemOpen(false);
            setEditingWorkItem(null);
          }
        }}
        workItem={editingWorkItem}
        defaultContactId={editingWorkItem ? undefined : lockedContact.id}
        defaultContactLabel={editingWorkItem ? undefined : lockedContact.label}
        onSuccess={() => {
          setCreateWorkItemOpen(false);
          setEditingWorkItem(null);
          refreshContactData();
        }}
      />

      <NoteFormDialog
        open={createNoteOpen || !!editingNote}
        onOpenChange={(open) => {
          if (!open) {
            setCreateNoteOpen(false);
            setEditingNote(null);
          }
        }}
        note={editingNote}
        defaultContactId={editingNote ? undefined : lockedContact.id}
        defaultContactLabel={editingNote ? undefined : lockedContact.label}
        lockContact={!editingNote}
        onSuccess={() => {
          setCreateNoteOpen(false);
          setEditingNote(null);
          refreshContactData();
        }}
      />

      <TaskFormDialog
        open={createTaskOpen || !!editingTask}
        onOpenChange={(open) => {
          if (!open) {
            setCreateTaskOpen(false);
            setEditingTask(null);
          }
        }}
        task={editingTask}
        defaultContactId={editingTask ? undefined : lockedContact.id}
        defaultContactLabel={editingTask ? undefined : lockedContact.label}
        lockContact={!editingTask}
        onSuccess={() => {
          setCreateTaskOpen(false);
          setEditingTask(null);
          refreshContactData();
        }}
      />

      {(createAppointmentOpen || editingAppointment) ? (
      <AppointmentFormDialog
        key={
          editingAppointment
            ? `edit-${editingAppointment.id}`
            : `create-${lockedContact.id}`
        }
        sessionKey={
          editingAppointment
            ? `edit-${editingAppointment.id}`
            : `create-${lockedContact.id}`
        }
        open
        onOpenChange={(open) => {
          if (!open) {
            setCreateAppointmentOpen(false);
            setEditingAppointment(null);
          }
        }}
        appointment={editingAppointment}
        businessTimezone={business?.timezone}
        defaultContactId={editingAppointment ? undefined : lockedContact.id}
        defaultContactLabel={editingAppointment ? undefined : lockedContact.label}
        lockContact={!editingAppointment}
        isDeletePending={deleteAppointmentMutation.isPending}
        onDelete={
          editingAppointment
            ? () => {
                setDeleteAppointmentId(editingAppointment.id);
                setCreateAppointmentOpen(false);
                setEditingAppointment(null);
              }
            : undefined
        }
        onSuccess={() => {
          setCreateAppointmentOpen(false);
          setEditingAppointment(null);
          refreshContactData();
        }}
      />
      ) : null}

      <ConfirmDeleteDialog
        open={deleteContactOpen}
        onOpenChange={setDeleteContactOpen}
        title="Delete contact?"
        description="This will remove the contact and unlink related records."
        isPending={deleteContactMutation.isPending}
        onConfirm={() => deleteContactMutation.mutate()}
      />

      <ConfirmDeleteDialog
        open={!!deleteLeadId}
        onOpenChange={(open) => !open && setDeleteLeadId(null)}
        title="Delete lead?"
        description="This action cannot be undone."
        isPending={deleteLeadMutation.isPending}
        onConfirm={() => deleteLeadId && deleteLeadMutation.mutate(deleteLeadId)}
      />

      <ConfirmDeleteDialog
        open={!!deleteWorkItemId}
        onOpenChange={(open) => !open && setDeleteWorkItemId(null)}
        title="Delete work item?"
        description="This action cannot be undone."
        isPending={deleteWorkItemMutation.isPending}
        onConfirm={() =>
          deleteWorkItemId && deleteWorkItemMutation.mutate(deleteWorkItemId)
        }
      />

      <ConfirmDeleteDialog
        open={!!deleteNoteId}
        onOpenChange={(open) => !open && setDeleteNoteId(null)}
        title="Delete note?"
        description="This action cannot be undone."
        isPending={deleteNoteMutation.isPending}
        onConfirm={() => deleteNoteId && deleteNoteMutation.mutate(deleteNoteId)}
      />

      <ConfirmDeleteDialog
        open={!!deleteTaskId}
        onOpenChange={(open) => !open && setDeleteTaskId(null)}
        title="Delete task?"
        description="This action cannot be undone."
        isPending={deleteTaskMutation.isPending}
        onConfirm={() => deleteTaskId && deleteTaskMutation.mutate(deleteTaskId)}
      />

      <ConfirmDeleteDialog
        open={!!deleteAppointmentId}
        onOpenChange={(open) => !open && setDeleteAppointmentId(null)}
        title="Delete appointment?"
        description="This action cannot be undone."
        isPending={deleteAppointmentMutation.isPending}
        onConfirm={() =>
          deleteAppointmentId &&
          deleteAppointmentMutation.mutate(deleteAppointmentId)
        }
      />
    </TooltipProvider>
  );
}

export default function ContactWorkspacePage() {
  return (
    <Suspense
      fallback={
        <ContactWorkspaceShell>
          <Skeleton className="m-4 h-full rounded-2xl" />
        </ContactWorkspaceShell>
      }
    >
      <ContactWorkspacePageContent />
    </Suspense>
  );
}
