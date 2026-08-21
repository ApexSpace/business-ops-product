"use client";

import { useIsMobile } from "@/lib/hooks/use-mobile";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DrawerFooterContent } from "@/components/drawer/drawer-footer-content";
import { DrawerFormFieldGroup } from "@/components/drawer/drawer-form-field-group";
import { DrawerFormFields } from "@/components/drawer/drawer-form-fields";
import { DrawerHeaderContent } from "@/components/drawer/drawer-header-content";
import { DrawerPrimaryButton } from "@/components/drawer/drawer-primary-button";
import { DrawerSelectField } from "@/components/drawer/drawer-select-field";
import { DrawerShell } from "@/components/layout/drawer-shell";
import { Input } from "@/components/ui/input";
import { createAppointment } from "@/features/appointments/api/appointments.api";
import { AppointmentDateTimeFields } from "@/features/appointments/components/drawer/appointment-datetime-fields";
import { AppointmentTypeTabs } from "@/features/appointments/components/drawer/appointment-type-tabs";
import type { AppointmentCreateDefaults } from "@/features/appointments/hooks/use-appointment-drawer";
import {
  formatDurationLabel,
  generateDurationOptions,
  scheduleFromUtcIso,
} from "@/features/appointments/utils/appointment-service-lines";
import { getCalendarSchedulingConfig } from "@/features/appointments/utils/appointment-scheduling";
import { listCalendars } from "@/features/calendars/api/calendars.api";
import { listBusinessMembers } from "@/features/settings/api/business.api";
import {
  resolveAppointmentDisplayTimezone,
  wallTimeInTimezoneToUtcIso,
} from "@/features/calendars/utils/timezone";
import { useCurrentBusiness } from "@/features/settings/hooks/use-current-business";
import {
  APPOINTMENT_DRAWER_BODY_INSET_CLASS,
  APPOINTMENT_DRAWER_FIELD_CLASS,
  APPOINTMENT_DRAWER_FOOTER_CLASS,
  APPOINTMENT_DRAWER_SHELL_CLASS,
  APPOINTMENT_DRAWER_MOBILE_SHELL_CLASS,
  APPOINTMENT_DRAWER_SHELL_HEADER_CLASS,
  APPOINTMENT_DRAWER_STACKED_FIELD_GROUP_CLASS,
} from "@/features/appointments/styles/appointment-drawer-tokens";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

export interface AppointmentTimeBlockDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults: AppointmentCreateDefaults | null;
  defaultCalendarId?: string;
  timezone?: string;
  onSuccess?: () => void;
  onSwitchToAppointment?: () => void;
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
  onSwitchToAppointment,
}: AppointmentTimeBlockDrawerProps) {
  const isMobile = useIsMobile();
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
  const durationOptions = useMemo(
    () =>
      generateDurationOptions().map((minutes) => ({
        value: String(minutes),
        label: formatDurationLabel(minutes),
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
    if (!open || !defaults) return;
    const schedule = scheduleFromUtcIso(
      defaults.startAt,
      defaults.endAt ?? defaults.startAt,
      timezone,
    );
    setDateKey(schedule.dateKey);
    setStartMinutes(schedule.appointmentStartMinutes);
    setDurationMinutes("");
    setAssignedToId(defaults.assignedToId ?? "");
    setReason("");
  }, [open, defaults, timezone]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!calendarId) throw new Error("No calendar available");
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

      return createAppointment({
        calendarId,
        assignedToId,
        title: "Time block",
        startAt,
        endAt,
        notes: reason.trim() || undefined,
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
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not create time block",
      );
    },
  });

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

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      variant="sheet"
      width="appointment"
      chrome={isMobile ? "mobile-brand" : "default"}
      spineLabel={isMobile ? undefined : "TIME BLOCK"}
      className={
        isMobile
          ? APPOINTMENT_DRAWER_MOBILE_SHELL_CLASS
          : APPOINTMENT_DRAWER_SHELL_CLASS
      }
      title={
        isMobile ? (
          "New Time Block"
        ) : (
          <DrawerHeaderContent
            eyebrow={headerDateLabel || undefined}
            title="New Time Block"
          />
        )
      }
      headerClassName={
        isMobile ? undefined : APPOINTMENT_DRAWER_SHELL_HEADER_CLASS
      }
      contentClassName="!px-0 !py-0"
      footerClassName={APPOINTMENT_DRAWER_FOOTER_CLASS}
      footer={
        <DrawerFooterContent>
          <DrawerPrimaryButton
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Saving…" : "Create Time Block"}
          </DrawerPrimaryButton>
        </DrawerFooterContent>
      }
    >
      <div className={APPOINTMENT_DRAWER_BODY_INSET_CLASS}>
        <AppointmentTypeTabs
          value="time-block"
          onAppointmentClick={onSwitchToAppointment}
        />

        <DrawerFormFields>
          <AppointmentDateTimeFields
            dateKey={dateKey}
            startMinutes={startMinutes}
            slotIntervalMinutes={schedulingConfig.slotIntervalMinutes}
            onDateChange={setDateKey}
            onStartMinutesChange={setStartMinutes}
          />

          <DrawerSelectField
            id="time-block-duration"
            label="Duration"
            value={durationMinutes}
            onValueChange={setDurationMinutes}
            placeholder="Select duration"
            options={durationOptions}
          />

          <DrawerSelectField
            id="time-block-staff"
            label="Staff"
            value={assignedToId}
            onValueChange={setAssignedToId}
            placeholder="Select staff member"
            options={staffOptions}
          />

          <DrawerFormFieldGroup
            label="Reason"
            htmlFor="time-block-reason"
            className={APPOINTMENT_DRAWER_STACKED_FIELD_GROUP_CLASS}
          >
            <Input
              id="time-block-reason"
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
      </div>
    </DrawerShell>
  );
}
