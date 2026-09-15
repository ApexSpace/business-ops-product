"use client";

import { useState } from "react";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { useContactDetail } from "@/features/contacts/hooks/use-contact-detail";
import { useContactFinancialRecords } from "@/features/contacts/hooks/use-contact-financial-records";
import { useContactRelatedRecords } from "@/features/contacts/hooks/use-contact-related-records";
import { useContactWorkspaceMutations } from "@/features/contacts/workspace/use-contact-workspace-mutations";
import { useCurrentBusiness } from "@/features/settings/hooks/use-current-business";
import { resolveNavEntityLabels } from "@/lib/snapshot/resolve-terminology";
import { useSnapshotContext } from "@/lib/snapshot/use-snapshot-context";
import { isContactFinancialSection } from "@/features/contacts/utils/contact-financial";
import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import type { Lead, Note, Task, WorkItem } from "@/features/contacts/types";
import type { ContactRecordsSectionId } from "@/features/contacts/workspace/contact-workspace";

export function useContactDetailPanel(
  contactId: string,
  activeSection: ContactRecordsSectionId,
) {
  const canDeleteLead = useCan(PERMISSIONS["members.invite"]);

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
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);
  const [deleteAppointmentId, setDeleteAppointmentId] = useState<
    string | null
  >(null);

  const { data: business } = useCurrentBusiness();
  const { context: snapshotContext } = useSnapshotContext();
  const labels = resolveNavEntityLabels(snapshotContext.terminology);

  const {
    data: contact,
    isLoading: contactLoading,
    isError: contactError,
  } = useContactDetail(contactId);

  const related = useContactRelatedRecords(contactId, activeSection);
  const financial = useContactFinancialRecords(
    contactId,
    isContactFinancialSection(activeSection),
  );
  const mutations = useContactWorkspaceMutations(contactId);

  return {
    contactId,
    business,
    labels,
    contact,
    contactLoading,
    contactError,
    canDeleteLead,
    activeSection,
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
    ...related,
    ...financial,
    ...mutations,
  };
}

export type ContactDetailPanelState = ReturnType<typeof useContactDetailPanel>;
