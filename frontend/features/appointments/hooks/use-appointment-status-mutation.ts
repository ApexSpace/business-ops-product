"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateAppointmentStatus } from "@/features/appointments/api/appointments.api";
import type { AppointmentStatus } from "@/features/appointments/schemas/appointment-profile";
import { queryKeys } from "@/lib/query/keys";

export function useAppointmentStatusMutation(appointmentId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: AppointmentStatus) =>
      updateAppointmentStatus(appointmentId!, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.all(),
      });
      toast.success("Status updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
