"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { notifyAppointmentClient } from "@/features/appointments/api/appointments.api";
import { queryKeys } from "@/lib/query/keys";

export function useAppointmentNotifyMutation(appointmentId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notifyAppointmentClient(appointmentId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.all(),
      });
      toast.success("Client notified");
    },
  });
}
