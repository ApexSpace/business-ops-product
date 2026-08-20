"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DrawerFormFieldGroup } from "@/components/drawer/drawer-form-field-group";
import { DrawerFormFields } from "@/components/drawer/drawer-form-fields";
import { DrawerSelectField } from "@/components/drawer/drawer-select-field";
import { Input } from "@/components/ui/input";
import { updateAppointment } from "@/features/appointments/api/appointments.api";
import { AppointmentDateTimeFields } from "@/features/appointments/components/drawer/appointment-datetime-fields";
import {
  formatTimeBlockDurationLabel,
  getTimeBlockDurationMinutes,
} from "@/features/appointments/components/drawer/time-block-detail-view";
import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import {
  generateDurationOptions,
  scheduleFromUtcIso,
} from "@/features/appointments/utils/appointment-service-lines";
import { getCalendarSchedulingConfig } from "@/features/appointments/utils/appointment-scheduling";
import { listCalendars } from "@/features/calendars/api/calendars.api";
import { wallTimeInTimezoneToUtcIso } from "@/features/calendars/utils/timezone";
import { listBusinessMembers } from "@/features/settings/api/business.api";
import {
  APPOINTMENT_DRAWER_FIELD_CLASS,
  APPOINTMENT_DRAWER_STACKED_FIELD_GROUP_CLASS,
} from "@/features/appointments/styles/appointment-drawer-tokens";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

function memberLabel(member: {
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}): string {
  const name = [member.user.firstName, member.user.lastName]
    .filter(Boolean)
    .join(" ");
  return name || member.user.email;
}

export interface TimeBlockUpdateFormHandle {
  save: () => void;
}

export interface TimeBlockUpdateFormProps {
  appointment: Appointment;
  timezone: string;
  onSaved: () => void;
  onPendingChange?: (pending: boolean) => void;
  onHeaderDateChange?: (label: string) => void;
}

export const TimeBlockUpdateForm = forwardRef<
  TimeBlockUpdateFormHandle,
  TimeBlockUpdateFormProps
>(function TimeBlockUpdateForm(
  {
    appointment,
    timezone,
    onSaved,
    onPendingChange,
    onHeaderDateChange,
  },
  ref,
) {
  const queryClient = useQueryClient();

  const { data: calendars } = useQuery({
    queryKey: queryKeys.calendars.list({ limit: 100 }),
    queryFn: () => listCalendars({ page: 1, limit: 100 }),
  });

  const { data: members } = useQuery({
    queryKey: queryKeys.business.members({ page: 1, limit: 100 }),
    queryFn: () => listBusinessMembers({ page: 1, limit: 100 }),
  });

  const selectedCalendar = useMemo(
    () =>
      calendars?.items.find((calendar) => calendar.id === appointment.calendarId),
    [calendars?.items, appointment.calendarId],
  );

  const schedulingConfig = getCalendarSchedulingConfig(selectedCalendar);

  const durationOptions = useMemo(
    () =>
      generateDurationOptions().map((minutes) => ({
        value: String(minutes),
        label: formatTimeBlockDurationLabel(minutes),
      })),
    [],
  );

  const staffOptions = useMemo(
    () =>
      (members?.items ?? []).map((member) => ({
        value: member.userId,
        label: memberLabel(member),
      })),
    [members?.items],
  );

  const [dateKey, setDateKey] = useState("");
  const [startMinutes, setStartMinutes] = useState(9 * 60);
  const [durationMinutes, setDurationMinutes] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    const schedule = scheduleFromUtcIso(
      appointment.startAt,
      appointment.endAt,
      timezone,
    );
    const duration = getTimeBlockDurationMinutes(appointment, timezone);
    setDateKey(schedule.dateKey);
    setStartMinutes(schedule.appointmentStartMinutes);
    setDurationMinutes(duration > 0 ? String(duration) : "");
    setAssignedToId(appointment.assignedToId ?? "");
    setReason(appointment.notes ?? "");
  }, [appointment, timezone]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!assignedToId) throw new Error("Select a staff member");
      if (!durationMinutes) throw new Error("Select a duration");
      if (!dateKey) throw new Error("Select a date");

      const duration = Number(durationMinutes);
      const startAt = wallTimeInTimezoneToUtcIso(
        dateKey,
        Math.floor(startMinutes / 60),
        startMinutes % 60,
        timezone,
      );
      const endMinutes = startMinutes + duration;
      const endAt = wallTimeInTimezoneToUtcIso(
        dateKey,
        Math.floor(endMinutes / 60),
        endMinutes % 60,
        timezone,
      );

      return updateAppointment(appointment.id, {
        calendarId: appointment.calendarId,
        assignedToId,
        title: appointment.title?.trim() || "Time block",
        startAt,
        endAt,
        notes: reason.trim() || undefined,
        sendConfirmation: false,
      });
    },
    onSuccess: (saved) => {
      if (saved.googleSyncWarning) {
        toast.warning(`Saved, but Google sync failed: ${saved.googleSyncWarning}`);
      }
      if (saved.scheduleWarning) {
        toast.warning(saved.scheduleWarning);
      }
      toast.success("Time block updated");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.all(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.detail(appointment.id),
      });
      onSaved();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not update time block",
      );
    },
  });

  useImperativeHandle(
    ref,
    () => ({
      save: () => mutation.mutate(),
    }),
    [mutation],
  );

  useEffect(() => {
    onPendingChange?.(mutation.isPending);
  }, [mutation.isPending, onPendingChange]);

  const headerDateLabel = useMemo(() => {
    if (!dateKey) return "";
    const date = new Date(`${dateKey}T12:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    return date
      .toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
      .toUpperCase();
  }, [dateKey]);

  useEffect(() => {
    onHeaderDateChange?.(headerDateLabel);
  }, [headerDateLabel, onHeaderDateChange]);

  return (
    <DrawerFormFields>
      <AppointmentDateTimeFields
        dateKey={dateKey}
        startMinutes={startMinutes}
        slotIntervalMinutes={schedulingConfig.slotIntervalMinutes}
        onDateChange={setDateKey}
        onStartMinutesChange={setStartMinutes}
      />

      <DrawerSelectField
        id="time-block-edit-duration"
        label="Duration"
        value={durationMinutes}
        onValueChange={setDurationMinutes}
        placeholder="Select duration"
        options={durationOptions}
      />

      <DrawerSelectField
        id="time-block-edit-staff"
        label="Staff"
        value={assignedToId}
        onValueChange={setAssignedToId}
        placeholder="Select staff member"
        options={staffOptions}
      />

      <DrawerFormFieldGroup
        label="Reason"
        htmlFor="time-block-edit-reason"
        className={APPOINTMENT_DRAWER_STACKED_FIELD_GROUP_CLASS}
      >
        <Input
          id="time-block-edit-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Add reason"
          className={cn(
            APPOINTMENT_DRAWER_FIELD_CLASS,
            "placeholder:text-[#9A9A9A]",
          )}
        />
      </DrawerFormFieldGroup>
    </DrawerFormFields>
  );
});
