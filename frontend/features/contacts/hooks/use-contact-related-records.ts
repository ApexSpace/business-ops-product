"use client";

import { useQuery } from "@tanstack/react-query";
import { listAppointments } from "@/features/appointments/api/appointments.api";
import { listLeads } from "@/features/leads/api/leads.api";
import { listNotes } from "@/features/notes/api/notes.api";
import { listTasks } from "@/features/tasks/api/tasks.api";
import { listWorkItems } from "@/features/work-items/api/work-items.api";
import type { ContactRecordsSectionId } from "@/features/contacts/workspace/contact-workspace";
import { queryKeys } from "@/lib/query/keys";

export const CONTACT_RELATED_LIMIT = 100;

export function useContactRelatedRecords(
  contactId: string,
  activeSection?: ContactRecordsSectionId,
) {
  const listFilters = {
    contactId,
    page: 1,
    limit: CONTACT_RELATED_LIMIT,
  };

  const leadsQuery = useQuery({
    queryKey: queryKeys.leads.list(listFilters),
    queryFn: () => listLeads(listFilters),
    enabled: !!contactId && (!activeSection || activeSection === "leads"),
  });

  const workItemsQuery = useQuery({
    queryKey: queryKeys.workItems.list("work-items", listFilters),
    queryFn: () => listWorkItems(listFilters),
    enabled: !!contactId && (!activeSection || activeSection === "work-items"),
  });

  const notesQuery = useQuery({
    queryKey: queryKeys.notes.list(listFilters),
    queryFn: () => listNotes(listFilters),
    enabled: !!contactId && (!activeSection || activeSection === "notes"),
  });

  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks.list(listFilters),
    queryFn: () => listTasks(listFilters),
    enabled: !!contactId && (!activeSection || activeSection === "tasks"),
  });

  const appointmentsQuery = useQuery({
    queryKey: queryKeys.appointments.list(listFilters),
    queryFn: () => listAppointments(listFilters),
    enabled:
      !!contactId && (!activeSection || activeSection === "appointments"),
  });

  return {
    leads: leadsQuery.data?.items ?? [],
    workItems: workItemsQuery.data?.items ?? [],
    notes: notesQuery.data?.items ?? [],
    tasks: tasksQuery.data?.items ?? [],
    appointments: appointmentsQuery.data?.items ?? [],
    leadsLoading: leadsQuery.isLoading,
    workItemsLoading: workItemsQuery.isLoading,
    notesLoading: notesQuery.isLoading,
    tasksLoading: tasksQuery.isLoading,
    appointmentsLoading: appointmentsQuery.isLoading,
  };
}
