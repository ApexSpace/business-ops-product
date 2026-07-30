"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DrawerShell,
  DRAWER_FOOTER_BUTTON_CLASS,
} from "@/components/layout/drawer-shell";
import { ActionButton } from "@/components/ui/action-button";
import { Textarea } from "@/components/ui/textarea";
import { createAppointment } from "@/features/appointments/api/appointments.api";
import { AppointmentBookingDateTimeFields } from "@/features/appointments/components/appointment-booking-datetime-fields";
import type { AppointmentCreateDefaults } from "@/features/appointments/hooks/use-appointment-drawer";
import {
  formatDurationLabel,
  generateDurationOptions,
  scheduleFromUtcIso,
} from "@/features/appointments/utils/appointment-service-lines";
import { getCalendarSchedulingConfig } from "@/features/appointments/utils/appointment-scheduling";
import { listCalendars } from "@/features/calendars/api/calendars.api";
import {
  listBusinessMembers,
} from "@/features/settings/api/business.api";
import { resolveAppointmentDisplayTimezone, wallTimeInTimezoneToUtcIso } from "@/features/calendars/utils/timezone";
import { useCurrentBusiness } from "@/features/settings/hooks/use-current-business";
import { queryKeys } from "@/lib/query/keys";
import {
  DRAWER_FIELD_LABEL_CLASS,
  DRAWER_FORM_ITEM_CLASS,
} from "@/lib/design/drawer-shell-tokens";
import {
  APPOINTMENT_POPUP_FIELD_CLASS,
  APPOINTMENT_POPUP_FOOTER_CLASS,
  APPOINTMENT_POPUP_HEADER_CLASS,
  APPOINTMENT_POPUP_PRIMARY_BUTTON_CLASS,
  APPOINTMENT_POPUP_SHELL_CLASS,
} from "@/features/appointments/styles/appointment-side-popup";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface AppointmentTimeBlockDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults: AppointmentCreateDefaults | null;
  defaultCalendarId?: string;
  /** Authoritative timezone from the calendar grid (keeps clicked slot time consistent). */
  timezone?: string;
  onSuccess?: () => void;
}

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

export function AppointmentTimeBlockDrawer({
  open,
  onOpenChange,
  defaults,
  defaultCalendarId,
  timezone: timezoneProp,
  onSuccess,
}: AppointmentTimeBlockDrawerProps) {
  const queryClient = useQueryClient();
  const { data: business } = useCurrentBusiness();

  const { data: calendars } = useQuery({
    queryKey: queryKeys.calendars.list({ limit: 100 }),
    queryFn: () => listCalendars({ page: 1, limit: 100 }),
  });

  const { data: members } = useQuery({
    queryKey: queryKeys.business.members({ page: 1, limit: 100 }),
    queryFn: () => listBusinessMembers({ page: 1, limit: 100 }),
  });

  const calendarId =
    defaults?.calendarId ?? defaultCalendarId ?? calendars?.items[0]?.id ?? "";

  const selectedCalendar = useMemo(
    () => calendars?.items.find((calendar) => calendar.id === calendarId),
    [calendars?.items, calendarId],
  );

  const resolvedTimezone = useMemo(
    () =>
      resolveAppointmentDisplayTimezone(
        business?.timezone,
        calendarId || undefined,
        calendars?.items,
      ),
    [business?.timezone, calendarId, calendars?.items],
  );
  const timezone = timezoneProp ?? resolvedTimezone;

  const schedulingConfig = getCalendarSchedulingConfig(selectedCalendar);
  const durationOptions = useMemo(() => generateDurationOptions(), []);

  const staffOptions = useMemo(
    () =>
      (members?.items ?? []).map((member) => ({
        userId: member.userId,
        label: memberLabel(member),
      })),
    [members?.items],
  );

  const [title, setTitle] = useState("Time block");
  const [dateKey, setDateKey] = useState("");
  const [startMinutes, setStartMinutes] = useState(9 * 60);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [assignedToId, setAssignedToId] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open || !defaults) return;
    const schedule = scheduleFromUtcIso(
      defaults.startAt,
      defaults.endAt ?? defaults.startAt,
      timezone,
    );
    setTitle("Time block");
    setDateKey(schedule.dateKey);
    setStartMinutes(schedule.appointmentStartMinutes);
    setDurationMinutes(60);
    setAssignedToId(defaults.assignedToId ?? staffOptions[0]?.userId ?? "");
    setNotes("");
  }, [open, defaults, timezone, staffOptions]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!calendarId) throw new Error("No calendar available");
      if (!assignedToId) throw new Error("Select a staff member");
      if (!dateKey) throw new Error("Select a date");

      const startAt = wallTimeInTimezoneToUtcIso(
        dateKey,
        Math.floor(startMinutes / 60),
        startMinutes % 60,
        timezone,
      );
      const endMinutes = startMinutes + durationMinutes;
      const endAt = wallTimeInTimezoneToUtcIso(
        dateKey,
        Math.floor(endMinutes / 60),
        endMinutes % 60,
        timezone,
      );

      return createAppointment({
        calendarId,
        assignedToId,
        title: title.trim() || "Time block",
        startAt,
        endAt,
        notes: notes.trim() || undefined,
        isTimeBlock: true,
        sendConfirmation: false,
      });
    },
    onSuccess: () => {
      toast.success("Time block created");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.all(),
      });
      onOpenChange(false);
      onSuccess?.();
    },
  });

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      variant="sheet"
      width="appointment"
      className={APPOINTMENT_POPUP_SHELL_CLASS}
      headerClassName={cn(
        APPOINTMENT_POPUP_HEADER_CLASS,
        "[&_[data-slot=sheet-title]]:text-[20px] [&_[data-slot=sheet-title]]:font-bold [&_[data-slot=sheet-title]]:text-[#7E3BED]",
        "[&_button[aria-label=Close]]:size-8 [&_button[aria-label=Close]]:rounded-lg [&_button[aria-label=Close]]:border-0 [&_button[aria-label=Close]]:bg-[#F0F0F0] [&_button[aria-label=Close]]:text-[#6B6B6B] [&_button[aria-label=Close]]:shadow-none [&_button[aria-label=Close]]:hover:bg-[#E9E9E9]",
      )}
      contentClassName="!px-0 !py-0"
      footerClassName={APPOINTMENT_POPUP_FOOTER_CLASS}
      title="Time Block"
      footer={
        <ActionButton
          type="button"
          className={cn(
            DRAWER_FOOTER_BUTTON_CLASS,
            APPOINTMENT_POPUP_PRIMARY_BUTTON_CLASS,
          )}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Saving…" : "Create time block"}
        </ActionButton>
      }
    >
      <AppointmentBookingDateTimeFields
        dateKey={dateKey}
        startMinutes={startMinutes}
        slotIntervalMinutes={schedulingConfig.slotIntervalMinutes}
        onDateChange={setDateKey}
        onStartMinutesChange={setStartMinutes}
      />

      <div className="flex flex-col gap-[9px] px-5 py-3">
        <div className={cn(DRAWER_FORM_ITEM_CLASS)}>
          <span className={DRAWER_FIELD_LABEL_CLASS}>Duration</span>
          <Select
            value={String(durationMinutes)}
            onValueChange={(value) => setDurationMinutes(Number(value))}
          >
            <SelectTrigger className={APPOINTMENT_POPUP_FIELD_CLASS}>
              {formatDurationLabel(durationMinutes)}
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {durationOptions.map((minutes) => (
                <SelectItem key={minutes} value={String(minutes)}>
                  {formatDurationLabel(minutes)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={cn(DRAWER_FORM_ITEM_CLASS)}>
          <span className={DRAWER_FIELD_LABEL_CLASS}>Staff</span>
          <Select
            value={assignedToId}
            onValueChange={(value) => setAssignedToId(value ?? "")}
          >
            <SelectTrigger className={APPOINTMENT_POPUP_FIELD_CLASS}>
              {staffOptions.find((s) => s.userId === assignedToId)?.label ??
                "Select staff"}
            </SelectTrigger>
            <SelectContent>
              {staffOptions.map((staff) => (
                <SelectItem key={staff.userId} value={staff.userId}>
                  {staff.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={cn(DRAWER_FORM_ITEM_CLASS)}>
          <span className={DRAWER_FIELD_LABEL_CLASS}>Title</span>
          <Textarea
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            rows={2}
            className={cn(APPOINTMENT_POPUP_FIELD_CLASS, "min-h-[72px] py-3")}
          />
        </div>

        <div className={cn(DRAWER_FORM_ITEM_CLASS)}>
          <span className={DRAWER_FIELD_LABEL_CLASS}>Notes</span>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add a note…"
            rows={3}
            className={cn(APPOINTMENT_POPUP_FIELD_CLASS, "min-h-[90px] py-3")}
          />
        </div>
      </div>
    </DrawerShell>
  );
}
