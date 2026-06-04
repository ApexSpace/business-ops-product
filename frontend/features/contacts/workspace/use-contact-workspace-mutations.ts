"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteAppointment } from "@/features/appointments/api/appointments.api";
import { deleteContact } from "@/features/contacts/api/contacts.api";
import { deleteLead } from "@/features/leads/api/leads.api";
import { deleteNote } from "@/features/notes/api/notes.api";
import {
  completeTask,
  deleteTask,
  reopenTask,
} from "@/features/tasks/api/tasks.api";
import { deleteWorkItem } from "@/features/work-items/api/work-items.api";
import {
  invalidateContactDetail,
  invalidateContactLists,
  invalidateContactPicker,
  invalidateLeadLists,
  invalidateNoteLists,
  invalidatePipelines,
  invalidateTaskLists,
  invalidateWorkItemLists,
} from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";

export function useContactWorkspaceMutations(contactId: string) {
  const queryClient = useQueryClient();

  const refreshContactData = () => {
    void invalidateContactDetail(queryClient, contactId);
    void invalidateLeadLists(queryClient);
    void invalidateWorkItemLists(queryClient);
    void invalidateNoteLists(queryClient);
    void invalidateTaskLists(queryClient);
    void invalidatePipelines(queryClient);
    void queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all() });
  };

  const deleteContactMutation = useMutation({
    mutationFn: () => deleteContact(contactId),
    onSuccess: () => {
      toast.success("Contact deleted");
      void invalidateContactLists(queryClient);
      void invalidateContactPicker(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteLeadMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      toast.success("Lead deleted");
      refreshContactData();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteWorkItemMutation = useMutation({
    mutationFn: deleteWorkItem,
    onSuccess: () => {
      toast.success("Work item deleted");
      refreshContactData();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      toast.success("Note deleted");
      refreshContactData();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      toast.success("Task deleted");
      refreshContactData();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const completeTaskMutation = useMutation({
    mutationFn: completeTask,
    onSuccess: () => {
      toast.success("Task completed");
      refreshContactData();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reopenTaskMutation = useMutation({
    mutationFn: reopenTask,
    onSuccess: () => {
      toast.success("Task reopened");
      refreshContactData();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: deleteAppointment,
    onSuccess: () => {
      toast.success("Appointment deleted");
      refreshContactData();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    refreshContactData,
    deleteContactMutation,
    deleteLeadMutation,
    deleteWorkItemMutation,
    deleteNoteMutation,
    deleteTaskMutation,
    completeTaskMutation,
    reopenTaskMutation,
    deleteAppointmentMutation,
  };
}
