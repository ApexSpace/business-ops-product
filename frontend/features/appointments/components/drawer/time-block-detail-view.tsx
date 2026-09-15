"use client";

import { DateTime } from "luxon";
import { DrawerFormFields } from "@/components/drawer/drawer-form-fields";
import { AppointmentDateTimeDisplay } from "@/features/appointments/components/drawer/appointment-datetime-fields";
import { AppointmentBookingDetails } from "@/features/appointments/components/drawer/appointment-booking-details";
import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import { getMemberDisplayName } from "@/features/appointments/schemas/appointment-profile";
import { formatDurationLabel } from "@/features/appointments/utils/appointment-service-lines";
import {
  APPOINTMENT_DRAWER_STACKED_FIELD_GROUP_CLASS,
  APPOINTMENT_DRAWER_VIEW_FIELD_LABEL_CLASS,
  APPOINTMENT_DRAWER_VIEW_FIELD_VALUE_CLASS,
} from "@/features/appointments/styles/appointment-drawer-tokens";
import { cn } from "@/lib/utils";

export function formatTimeBlockDurationLabel(minutes: number): string {
  if (minutes <= 0) return "0 minutes";
  if (minutes < 60) {
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }
  return formatDurationLabel(minutes);
}

export function getTimeBlockDurationMinutes(
  appointment: Appointment,
  timezone: string,
): number {
  const start = DateTime.fromISO(appointment.startAt, { zone: "utc" }).setZone(
    timezone,
  );
  const end = DateTime.fromISO(appointment.endAt, { zone: "utc" }).setZone(
    timezone,
  );
  return Math.max(0, Math.round(end.diff(start, "minutes").minutes));
}

function TimeBlockReadonlyField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn(APPOINTMENT_DRAWER_STACKED_FIELD_GROUP_CLASS, className)}>
      <span className={APPOINTMENT_DRAWER_VIEW_FIELD_LABEL_CLASS}>{label}</span>
      <span className={APPOINTMENT_DRAWER_VIEW_FIELD_VALUE_CLASS}>{value}</span>
    </div>
  );
}

export interface TimeBlockDetailViewProps {
  appointment: Appointment;
  timezone: string;
  dateLabel: string;
  timeLabel: string;
  updatedBy?: string | null;
  canViewHistory?: boolean;
  onDateClick?: () => void;
  onTimeClick?: () => void;
  className?: string;
}

export function TimeBlockDetailView({
  appointment,
  timezone,
  dateLabel,
  timeLabel,
  updatedBy = null,
  canViewHistory = false,
  onDateClick,
  onTimeClick,
  className,
}: TimeBlockDetailViewProps) {
  const durationLabel = formatTimeBlockDurationLabel(
    getTimeBlockDurationMinutes(appointment, timezone),
  );
  const staffLabel = appointment.assignedTo
    ? getMemberDisplayName(appointment.assignedTo)
    : "Unassigned";
  const reasonLabel = appointment.notes?.trim() || "";

  return (
    <DrawerFormFields className={className}>
      <AppointmentDateTimeDisplay
        dateLabel={dateLabel}
        timeLabel={timeLabel}
        onDateClick={onDateClick}
        onTimeClick={onTimeClick}
      />

      <TimeBlockReadonlyField label="Duration" value={durationLabel} />
      <TimeBlockReadonlyField label="Staff" value={staffLabel} />
      <TimeBlockReadonlyField label="Reason" value={reasonLabel} />

      {canViewHistory ? (
        <AppointmentBookingDetails
          createdAt={appointment.createdAt}
          updatedAt={appointment.updatedAt}
          createdBy={appointment.createdBy}
          updatedBy={updatedBy}
          timezone={timezone}
          defaultOpen={false}
          title="Details"
        />
      ) : null}
    </DrawerFormFields>
  );
}
