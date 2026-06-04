"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { listContacts } from "@/features/contacts/api/contacts.api";
import { useContactDetail } from "@/features/contacts/hooks/use-contact-detail";
import { useContactFinancialRecords } from "@/features/contacts/hooks/use-contact-financial-records";
import { useContactRelatedRecords } from "@/features/contacts/hooks/use-contact-related-records";
import { useContactWorkspaceMutations } from "@/features/contacts/workspace/use-contact-workspace-mutations";
import { useCurrentBusiness } from "@/features/settings/hooks/use-current-business";
import { getIndustryLabels } from "@/lib/config/industry-labels";
import {
  DEFAULT_CONTACT_RECORDS_SECTION,
  type ContactMobilePanel,
  type ContactRailItem,
  type ContactRecordsSectionId,
} from "@/features/contacts/workspace/contact-workspace";
import { isContactFinancialSection } from "@/features/contacts/utils/contact-financial";
import { useSetPageMetadata } from "@/lib/runtime/page-metadata-context";
import { queryKeys } from "@/lib/query/keys";
import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import type { Lead, Note, Task, WorkItem } from "@/features/contacts/types";

export function useContactWorkspace(contactId: string) {
  const setPageMetadata = useSetPageMetadata();
  const canDeleteLead = useCan(PERMISSIONS["members.invite"]);

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

  const { data: business } = useCurrentBusiness();
  const labels = getIndustryLabels(business?.industry);

  const { data: contactsList } = useQuery({
    queryKey: queryKeys.contacts.list({ page: 1, limit: 1 }),
    queryFn: () => listContacts({ page: 1, limit: 1 }),
  });

  const {
    data: contact,
    isLoading: contactLoading,
    isError: contactError,
  } = useContactDetail(contactId);

  const related = useContactRelatedRecords(contactId);
  const isFinancialSection = isContactFinancialSection(activeSection);
  const financial = useContactFinancialRecords(contactId, isFinancialSection);
  const mutations = useContactWorkspaceMutations(contactId);

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

  const handleRailSelect = (item: ContactRailItem) => {
    setActiveSection(item.sectionId);
    setMobilePanel("records");
  };

  return {
    contactId,
    business,
    labels,
    contact,
    contactLoading,
    contactError,
    contactTotal: contactsList?.meta.total,
    canDeleteLead,
    mobilePanel,
    setMobilePanel,
    activeSection,
    setActiveSection,
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
    handleRailSelect,
    ...related,
    ...financial,
    ...mutations,
  };
}

export type ContactWorkspaceState = ReturnType<typeof useContactWorkspace>;
