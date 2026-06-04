"use client";

import { useQuery } from "@tanstack/react-query";
import { listAppointments } from "@/features/appointments/api/appointments.api";
import { listLeads } from "@/features/leads/api/leads.api";
import { listNotes } from "@/features/notes/api/notes.api";
import { listTasks } from "@/features/tasks/api/tasks.api";
import { listWorkItems } from "@/features/work-items/api/work-items.api";
import { queryKeys } from "@/lib/query/keys";

export const CONTACT_RELATED_LIMIT = 100;

export function useContactRelatedRecords(contactId: string) {
  const listFilters = {
    contactId,
    page: 1,
    limit: CONTACT_RELATED_LIMIT,
  };

  const leadsQuery = useQuery({
    queryKey: queryKeys.leads.list(listFilters),
    queryFn: () => listLeads(listFilters),
    enabled: !!contactId,
  });

  const workItemsQuery = useQuery({
    queryKey: queryKeys.workItems.list(listFilters),
    queryFn: () => listWorkItems(listFilters),
    enabled: !!contactId,
  });

  const notesQuery = useQuery({
    queryKey: queryKeys.notes.list(listFilters),
    queryFn: () => listNotes(listFilters),
    enabled: !!contactId,
  });

  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks.list(listFilters),
    queryFn: () => listTasks(listFilters),
    enabled: !!contactId,
  });

  const appointmentsQuery = useQuery({
    queryKey: queryKeys.appointments.list(listFilters),
    queryFn: () => listAppointments(listFilters),
    enabled: !!contactId,
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
