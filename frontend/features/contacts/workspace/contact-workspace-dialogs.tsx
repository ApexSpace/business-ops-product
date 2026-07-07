"use client";

import dynamic from "next/dynamic";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { ContactFormDialog } from "@/features/contacts/components/contact-form-dialog";
import { CreateLeadDialog } from "@/features/leads/components/create-lead-dialog";
import { LeadFormDialog } from "@/features/leads/components/lead-form-dialog";
import { NoteFormDialog } from "@/features/notes/components/note-form-dialog";
import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";
import { WorkItemFormDialog } from "@/features/work-items/components/work-item-form-dialog";
import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import type { Contact } from "@/features/contacts/types";
import type { Lead, Note, Task, WorkItem } from "@/features/contacts/types";

export interface ContactWorkspaceDialogState {
  contactId: string;
  business?: { timezone?: string | null } | null;
  editOpen: boolean;
  setEditOpen: (open: boolean) => void;
  deleteContactOpen: boolean;
  setDeleteContactOpen: (open: boolean) => void;
  createLeadOpen: boolean;
  setCreateLeadOpen: (open: boolean) => void;
  createWorkItemOpen: boolean;
  setCreateWorkItemOpen: (open: boolean) => void;
  editingLead: Lead | null;
  setEditingLead: (lead: Lead | null) => void;
  editingWorkItem: WorkItem | null;
  setEditingWorkItem: (item: WorkItem | null) => void;
  deleteLeadId: string | null;
  setDeleteLeadId: (id: string | null) => void;
  deleteWorkItemId: string | null;
  setDeleteWorkItemId: (id: string | null) => void;
  createNoteOpen: boolean;
  setCreateNoteOpen: (open: boolean) => void;
  createTaskOpen: boolean;
  setCreateTaskOpen: (open: boolean) => void;
  editingNote: Note | null;
  setEditingNote: (note: Note | null) => void;
  editingTask: Task | null;
  setEditingTask: (task: Task | null) => void;
  deleteNoteId: string | null;
  setDeleteNoteId: (id: string | null) => void;
  deleteTaskId: string | null;
  setDeleteTaskId: (id: string | null) => void;
  createAppointmentOpen: boolean;
  setCreateAppointmentOpen: (open: boolean) => void;
  editingAppointment: Appointment | null;
  setEditingAppointment: (appointment: Appointment | null) => void;
  deleteAppointmentId: string | null;
  setDeleteAppointmentId: (id: string | null) => void;
  refreshContactData: () => void;
  deleteContactMutation: { isPending: boolean; mutate: (value: undefined, options?: { onSuccess?: () => void }) => void };
  deleteLeadMutation: { isPending: boolean; mutate: (id: string) => void };
  deleteWorkItemMutation: { isPending: boolean; mutate: (id: string) => void };
  deleteNoteMutation: { isPending: boolean; mutate: (id: string) => void };
  deleteTaskMutation: { isPending: boolean; mutate: (id: string) => void };
  deleteAppointmentMutation: { isPending: boolean; mutate: (id: string) => void };
}

const AppointmentFormDialog = dynamic(
  () =>
    import("@/features/appointments/components/appointment-form-dialog").then(
      (m) => m.AppointmentFormDialog,
    ),
  { ssr: false },
);

interface ContactWorkspaceDialogsProps {
  state: ContactWorkspaceDialogState;
  contact: Contact;
  lockedContact: { id: string; label: string };
  onContactDeleted: () => void;
  onContactEditSuccess: () => void;
  /** Drawer embed: create notes inline instead of NoteFormDialog. */
  useInlineNoteCreate?: boolean;
  /** Edit profile in the detail panel instead of ContactFormDialog. */
  useInlineContactEdit?: boolean;
}

export function ContactWorkspaceDialogs({
  state,
  contact,
  lockedContact,
  onContactDeleted,
  onContactEditSuccess,
  useInlineNoteCreate = false,
  useInlineContactEdit = false,
}: ContactWorkspaceDialogsProps) {
  const {
    business,
    editOpen,
    setEditOpen,
    deleteContactOpen,
    setDeleteContactOpen,
    createLeadOpen,
    setCreateLeadOpen,
    createWorkItemOpen,
    setCreateWorkItemOpen,
    editingLead,
    setEditingLead,
    editingWorkItem,
    setEditingWorkItem,
    deleteLeadId,
    setDeleteLeadId,
    deleteWorkItemId,
    setDeleteWorkItemId,
    createNoteOpen,
    setCreateNoteOpen,
    createTaskOpen,
    setCreateTaskOpen,
    editingNote,
    setEditingNote,
    editingTask,
    setEditingTask,
    deleteNoteId,
    setDeleteNoteId,
    deleteTaskId,
    setDeleteTaskId,
    createAppointmentOpen,
    setCreateAppointmentOpen,
    editingAppointment,
    setEditingAppointment,
    deleteAppointmentId,
    setDeleteAppointmentId,
    refreshContactData,
    deleteContactMutation,
    deleteLeadMutation,
    deleteWorkItemMutation,
    deleteNoteMutation,
    deleteTaskMutation,
    deleteAppointmentMutation,
  } = state;

  return (
    <>
      {!useInlineContactEdit ? (
        <ContactFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          contact={contact}
          onSuccess={onContactEditSuccess}
        />
      ) : null}

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
        open={(!useInlineNoteCreate && createNoteOpen) || !!editingNote}
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

      {createAppointmentOpen || editingAppointment ? (
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
          defaultContactLabel={
            editingAppointment ? undefined : lockedContact.label
          }
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
        onConfirm={() => {
          deleteContactMutation.mutate(undefined, { onSuccess: onContactDeleted });
        }}
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
    </>
  );
}
