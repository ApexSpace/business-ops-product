import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  bookFromWaitlist,
  cancelWaitlistEntry,
  dismissWaitlistMatch,
} from "@/features/waitlist/api/waitlist.api";
import { queryKeys } from "@/lib/query/keys";
import { toast } from "sonner";

function invalidateWaitlist(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.waitlist.all() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all() }),
  ]);
}

export function useWaitlistMutations() {
  const queryClient = useQueryClient();

  const dismiss = useMutation({
    mutationFn: dismissWaitlistMatch,
    onSuccess: () => {
      toast.success("Match dismissed — client stays on the waitlist");
      void invalidateWaitlist(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const book = useMutation({
    mutationFn: ({
      id,
      startAt,
      calendarId,
      staffId,
    }: {
      id: string;
      startAt: string;
      calendarId?: string;
      staffId?: string;
    }) =>
      bookFromWaitlist(id, {
        startAt,
        ...(calendarId ? { calendarId } : {}),
        ...(staffId ? { staffId } : {}),
      }),
    onSuccess: () => {
      toast.success("Appointment booked from waitlist");
      void invalidateWaitlist(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancel = useMutation({
    mutationFn: cancelWaitlistEntry,
    onSuccess: () => {
      toast.success("Waitlist entry removed");
      void invalidateWaitlist(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { dismiss, book, cancel };
}
