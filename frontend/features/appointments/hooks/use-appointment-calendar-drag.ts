"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateAppointment } from "@/features/appointments/api/appointments.api";
import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import { snapMinutesToSlot } from "@/features/appointments/utils/appointment-scheduling";
import {
  CALENDAR_SLOT_HEIGHT_PX,
  CALENDAR_SLOT_MINUTES,
} from "@/features/calendars/utils/calendar-dates";
import {
  dateKeyFromUtcIso,
  getMinutesFromMidnightInTimezone,
  wallTimeInTimezoneToUtcIso,
} from "@/features/calendars/utils/timezone";
import { queryKeys } from "@/lib/query/keys";

type DragMode = "move" | "resize" | null;

interface UseAppointmentCalendarDragOptions {
  timezone: string;
  slotIntervalMinutes?: number;
  enabled?: boolean;
}

export function useAppointmentCalendarDrag({
  timezone,
  slotIntervalMinutes = CALENDAR_SLOT_MINUTES,
  enabled = true,
}: UseAppointmentCalendarDragOptions) {
  const queryClient = useQueryClient();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragState = useRef<{
    appointment: Appointment;
    mode: DragMode;
    startY: number;
    originalStartMinutes: number;
    originalEndMinutes: number;
    dateKey: string;
  } | null>(null);

  const mutation = useMutation({
    mutationFn: ({
      appointment,
      startAt,
      endAt,
    }: {
      appointment: Appointment;
      startAt: string;
      endAt: string;
    }) =>
      updateAppointment(appointment.id, {
        calendarId: appointment.calendarId,
        contactId: appointment.contactId ?? undefined,
        title: appointment.title,
        startAt,
        endAt,
        services: (appointment.services ?? []).map((line) => ({
          serviceId: line.serviceId,
          assignedToId: line.assignedToId ?? undefined,
          startAt: line.startAt ?? undefined,
          durationMinutes: line.durationMinutes ?? undefined,
        })),
      }),
    onSuccess: (saved) => {
      if (saved.scheduleWarning) {
        toast.warning(saved.scheduleWarning);
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.all(),
      });
    },
  });

  const pixelsToMinutes = useCallback((deltaY: number) => {
    const raw = (deltaY / CALENDAR_SLOT_HEIGHT_PX) * slotIntervalMinutes;
    return snapMinutesToSlot(raw, slotIntervalMinutes);
  }, [slotIntervalMinutes]);

  const finishDrag = useCallback(
    (deltaY: number) => {
      const state = dragState.current;
      dragState.current = null;
      setDraggingId(null);
      if (!state || !enabled) return;

      const deltaMinutes = pixelsToMinutes(deltaY);
      if (deltaMinutes === 0) return;

      let nextStart = state.originalStartMinutes;
      let nextEnd = state.originalEndMinutes;

      if (state.mode === "move") {
        nextStart = Math.max(0, state.originalStartMinutes + deltaMinutes);
        const duration = state.originalEndMinutes - state.originalStartMinutes;
        nextEnd = nextStart + duration;
      } else if (state.mode === "resize") {
        nextEnd = Math.max(
          state.originalStartMinutes + slotIntervalMinutes,
          state.originalEndMinutes + deltaMinutes,
        );
      }

      const startAt = wallTimeInTimezoneToUtcIso(
        state.dateKey,
        Math.floor(nextStart / 60),
        nextStart % 60,
        timezone,
      );
      const endAt = wallTimeInTimezoneToUtcIso(
        state.dateKey,
        Math.floor(nextEnd / 60),
        nextEnd % 60,
        timezone,
      );

      mutation.mutate({ appointment: state.appointment, startAt, endAt });
    },
    [enabled, mutation, pixelsToMinutes, slotIntervalMinutes, timezone],
  );

  const startMove = useCallback(
    (appointment: Appointment, event: React.PointerEvent) => {
      if (!enabled || mutation.isPending) return;
      event.stopPropagation();
      event.preventDefault();
      const dateKey = dateKeyFromUtcIso(appointment.startAt, timezone);
      dragState.current = {
        appointment,
        mode: "move",
        startY: event.clientY,
        originalStartMinutes: getMinutesFromMidnightInTimezone(
          appointment.startAt,
          timezone,
        ),
        originalEndMinutes: getMinutesFromMidnightInTimezone(
          appointment.endAt,
          timezone,
        ),
        dateKey,
      };
      setDraggingId(appointment.id);

      const handleUp = (upEvent: PointerEvent) => {
        if (!dragState.current) return;
        const deltaY = upEvent.clientY - dragState.current.startY;
        finishDrag(deltaY);
      };

      window.addEventListener("pointerup", handleUp, { once: true });
    },
    [enabled, finishDrag, mutation.isPending, timezone],
  );

  const startResize = useCallback(
    (appointment: Appointment, event: React.PointerEvent) => {
      if (!enabled || mutation.isPending) return;
      event.stopPropagation();
      event.preventDefault();
      const dateKey = dateKeyFromUtcIso(appointment.startAt, timezone);
      dragState.current = {
        appointment,
        mode: "resize",
        startY: event.clientY,
        originalStartMinutes: getMinutesFromMidnightInTimezone(
          appointment.startAt,
          timezone,
        ),
        originalEndMinutes: getMinutesFromMidnightInTimezone(
          appointment.endAt,
          timezone,
        ),
        dateKey,
      };
      setDraggingId(appointment.id);

      const handleUp = (upEvent: PointerEvent) => {
        if (!dragState.current) return;
        const deltaY = upEvent.clientY - dragState.current.startY;
        finishDrag(deltaY);
        window.removeEventListener("pointerup", handleUp);
      };

      window.addEventListener("pointerup", handleUp, { once: true });
    },
    [enabled, finishDrag, mutation.isPending, timezone],
  );

  return {
    draggingId,
    startMove,
    startResize,
    isRescheduling: mutation.isPending,
  };
}
