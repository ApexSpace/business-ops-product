"use client";

import { useState } from "react";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { useContactDetail } from "@/features/contacts/hooks/use-contact-detail";
import { useContactFinancialRecords } from "@/features/contacts/hooks/use-contact-financial-records";
import { useContactRelatedRecords } from "@/features/contacts/hooks/use-contact-related-records";
import { isContactFinancialSection } from "@/features/contacts/utils/contact-financial";
import { useContactWorkspaceMutations } from "@/features/contacts/workspace/use-contact-workspace-mutations";
import {
  DEFAULT_CONTACT_RECORDS_SECTION,
  type ContactRailItem,
  type ContactRecordsSectionId,
} from "@/features/contacts/workspace/contact-workspace";
import { useCurrentBusiness } from "@/features/settings/hooks/use-current-business";
import { resolveNavEntityLabels } from "@/lib/snapshot/resolve-terminology";
import { useSnapshotContext } from "@/lib/snapshot/use-snapshot-context";
import { useAppRouter } from "@/lib/hooks/use-app-router";

export type ConversationInboxContactSidebarState = ReturnType<
  typeof useConversationInboxContactSidebar
>;

export function useConversationInboxContactSidebar(contactId: string | null) {
  const router = useAppRouter();
  const canDeleteLead = useCan(PERMISSIONS["members.invite"]);
  const [activeSection, setActiveSection] = useState<ContactRecordsSectionId>(
    DEFAULT_CONTACT_RECORDS_SECTION,
  );
  const [editOpen, setEditOpen] = useState(false);

  const { data: business } = useCurrentBusiness();
  const { context: snapshotContext } = useSnapshotContext();
  const labels = resolveNavEntityLabels(snapshotContext.terminology);

  const {
    data: contact,
    isLoading: contactLoading,
    isError: contactError,
  } = useContactDetail(contactId ?? "");

  const related = useContactRelatedRecords(contactId ?? "");
  const isFinancialSection = isContactFinancialSection(activeSection);
  const financial = useContactFinancialRecords(contactId ?? "", isFinancialSection);
  const mutations = useContactWorkspaceMutations(contactId ?? "");

  const contactHref = contactId ? `/business/contacts/${contactId}` : null;

  const openContact = () => {
    if (contactHref) router.push(contactHref);
  };

  const handleRailSelect = (item: ContactRailItem) => {
    setActiveSection(item.sectionId);
  };

  return {
    contactId,
    contact,
    contactLoading,
    contactError,
    labels,
    business,
    activeSection,
    handleRailSelect,
    canDeleteLead,
    contactHref,
    editOpen,
    setEditOpen,
    onEditContact: () => setEditOpen(true),
    onDeleteContact: openContact,
    onCreateLead: openContact,
    onCreateWorkItem: openContact,
    onCreateNote: openContact,
    onCreateTask: openContact,
    onCreateAppointment: openContact,
    onEditLead: () => openContact(),
    onDeleteLead: (id: string) => mutations.deleteLeadMutation.mutate(id),
    onEditWorkItem: () => openContact(),
    onDeleteWorkItem: (id: string) =>
      mutations.deleteWorkItemMutation.mutate(id),
    onEditNote: () => openContact(),
    onDeleteNote: (id: string) => mutations.deleteNoteMutation.mutate(id),
    onEditTask: () => openContact(),
    onDeleteTask: (id: string) => mutations.deleteTaskMutation.mutate(id),
    onCompleteTask: (id: string) => mutations.completeTaskMutation.mutate(id),
    onReopenTask: (id: string) => mutations.reopenTaskMutation.mutate(id),
    onEditAppointment: () => openContact(),
    onDeleteAppointment: (id: string) =>
      mutations.deleteAppointmentMutation.mutate(id),
    ...related,
    estimates: financial.estimates,
    invoices: financial.invoices,
    payments: financial.payments,
    financialLoading: financial.isLoading,
  };
}
