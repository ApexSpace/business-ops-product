"use client";

import { useQuery } from "@tanstack/react-query";
import { listAppointments } from "@/features/appointments/api/appointments.api";
import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import { queryKeys } from "@/lib/query/keys";

const HIGHLIGHT_LIMIT = 100;

function isCancelled(appointment: Appointment): boolean {
  return appointment.status === "CANCELLED";
}

function pickNextAndLast(appointments: Appointment[], nowMs: number) {
  const active = appointments.filter((appt) => !isCancelled(appt));
  const upcoming = active.filter(
    (appt) => new Date(appt.startAt).getTime() >= nowMs,
  );
  const past = active.filter(
    (appt) => new Date(appt.startAt).getTime() < nowMs,
  );

  return {
    nextAppointment: upcoming[0] ?? null,
    lastAppointment: past.length > 0 ? (past[past.length - 1] ?? null) : null,
  };
}

export function useContactAppointmentHighlights(contactId: string | null) {
  const filters = {
    contactId: contactId ?? undefined,
    page: 1,
    limit: HIGHLIGHT_LIMIT,
  };

  const query = useQuery({
    queryKey: queryKeys.appointments.list(filters),
    queryFn: () => listAppointments(filters),
    enabled: !!contactId,
  });

  const nowMs = Date.now();
  const { nextAppointment, lastAppointment } = pickNextAndLast(
    query.data?.items ?? [],
    nowMs,
  );

  return {
    nextAppointment,
    lastAppointment,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
