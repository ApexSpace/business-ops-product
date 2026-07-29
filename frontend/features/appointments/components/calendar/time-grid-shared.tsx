"use client";

import type { MouseEvent } from "react";
import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import { TimeGridAppointments } from "@/features/appointments/components/calendar/time-grid-appointments";
import type { Calendar } from "@/features/calendars/schemas/calendar-profile";
import {
  CALENDAR_DAY_END_HOUR,
  CALENDAR_DAY_START_HOUR,
  CALENDAR_SLOT_HEIGHT_PX,
  getTimeGridHeight,
  getTimeSlotLabels,
  minutesToTimeLabel,
} from "@/features/calendars/utils/calendar-dates";
import {
  dateKeyFromUtcIso,
  isTodayDateKey,
} from "@/features/calendars/utils/timezone";
import { CALENDAR_GRID } from "@/features/calendars/utils/calendar-grid-styles";
import { WorkingHoursOverlays } from "@/features/appointments/components/calendar/working-hours-overlays";
import type { BusinessHoursSlot } from "@/features/business-hours/types";
import { defaultBusinessHoursSlots } from "@/features/business-hours/utils/default-business-hours";
import { cn } from "@/lib/utils";

const GRID_HEIGHT = getTimeGridHeight();

interface TimeGridColumnProps {
  dateKey: string;
  appointments: Appointment[];
  /** Grid / navigation timezone (toolbar, slot clicks) */
  viewTimezone: string;
  calendars?: Calendar[];
  businessTimezone?: string | null;
  /** When set, only show appointments assigned to this staff member */
  staffUserId?: string;
  highlightToday?: boolean;
  onAppointmentClick: (appointment: Appointment) => void;
  onAppointmentMoveStart?: (
    appointment: Appointment,
    event: React.PointerEvent,
  ) => void;
  onAppointmentResizeStart?: (
    appointment: Appointment,
    event: React.PointerEvent,
  ) => void;
  draggingAppointmentId?: string | null;
  businessHoursSlots?: BusinessHoursSlot[];
  staffHoursSlots?: BusinessHoursSlot[] | null;
  onSlotClick: (
    dateKey: string,
    hour: number,
    minute: number,
    assignedToId?: string,
  ) => void;
}

export function TimeGridColumn({
  dateKey,
  appointments,
  viewTimezone,
  calendars,
  businessTimezone,
  staffUserId,
  highlightToday = true,
  onAppointmentClick,
  onAppointmentMoveStart,
  onAppointmentResizeStart,
  draggingAppointmentId,
  businessHoursSlots,
  staffHoursSlots,
  onSlotClick,
}: TimeGridColumnProps) {
  const slotLabels = getTimeSlotLabels();
  const resolvedBusinessHours =
    businessHoursSlots?.length ? businessHoursSlots : defaultBusinessHoursSlots();

  // Bucket appointments into day columns using the grid's view timezone so a
  // day/column matches the axis, slot clicks, and card positions.
  const dayAppointments = appointments.filter((a) => {
    if (dateKeyFromUtcIso(a.startAt, viewTimezone) !== dateKey) {
      return false;
    }
    if (staffUserId && a.assignedToId !== staffUserId) {
      return false;
    }
    return true;
  });

  const handleColumnClick = (event: MouseEvent<HTMLDivElement>) => {
    if (
      (event.target as HTMLElement).closest("[data-calendar-appointment]")
    ) {
      return;
    }

    const column = event.currentTarget;
    const rect = column.getBoundingClientRect();
    const y = event.clientY - rect.top;
    if (y < 0 || y >= GRID_HEIGHT) return;

    const slotIndex = Math.floor(y / CALENDAR_SLOT_HEIGHT_PX);
    const minutes = slotLabels[slotIndex];
    if (minutes === undefined) return;

    onSlotClick(dateKey, Math.floor(minutes / 60), minutes % 60, staffUserId);
  };

  return (
    <div
      className={cn(
        "relative min-w-0 cursor-pointer overflow-hidden",
        CALENDAR_GRID.column,
        highlightToday &&
          isTodayDateKey(dateKey, viewTimezone) &&
          "bg-primary/[0.03]",
      )}
      style={{ height: GRID_HEIGHT }}
      onClick={handleColumnClick}
      role="presentation"
    >
      {slotLabels.map((minutes) => (
        <div
          key={minutes}
          className={cn(
            "pointer-events-none w-full hover:bg-muted/30",
            minutes % 60 === 45 ? CALENDAR_GRID.slotHour : CALENDAR_GRID.slot,
          )}
          style={{ height: CALENDAR_SLOT_HEIGHT_PX }}
          aria-hidden
        />
      ))}
      <WorkingHoursOverlays
        dateKey={dateKey}
        timezone={viewTimezone}
        businessSlots={resolvedBusinessHours}
        staffSlots={staffHoursSlots}
      />
      <TimeGridAppointments
        appointments={dayAppointments}
        viewTimezone={viewTimezone}
        calendars={calendars}
        businessTimezone={businessTimezone}
        onAppointmentClick={onAppointmentClick}
        onAppointmentMoveStart={onAppointmentMoveStart}
        onAppointmentResizeStart={onAppointmentResizeStart}
        draggingAppointmentId={draggingAppointmentId}
      />
    </div>
  );
}

export function TimeGridGutter() {
  const slotLabels = getTimeSlotLabels();
  return (
    <div className={cn(CALENDAR_GRID.timeGutter, "bg-muted/20")}>
      {slotLabels.map((minutes) => (
        <div
          key={minutes}
          className={cn(
            "flex items-start justify-end pr-2 pt-0.5 text-[10px] text-muted-foreground",
            minutes % 60 === 45 ? CALENDAR_GRID.slotHour : CALENDAR_GRID.slot,
          )}
          style={{ height: CALENDAR_SLOT_HEIGHT_PX }}
        >
          {minutes % 60 === 0 ? minutesToTimeLabel(minutes) : ""}
        </div>
      ))}
    </div>
  );
}

export { GRID_HEIGHT, CALENDAR_DAY_START_HOUR, CALENDAR_DAY_END_HOUR };
