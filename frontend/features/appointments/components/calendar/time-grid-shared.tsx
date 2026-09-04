"use client";

import type { MouseEvent } from "react";
import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import { TimeGridAppointments } from "@/features/appointments/components/calendar/time-grid-appointments";
import { TimeGridBufferBands } from "@/features/appointments/components/calendar/time-grid-buffer-bands";
import type { Calendar } from "@/features/calendars/schemas/calendar-profile";
import {
  CALENDAR_SLOT_MINUTES,
  getTimeGridHeight,
  getTimeSlotLabels,
  minutesToTimeLabel,
} from "@/features/calendars/utils/calendar-dates";
import { dateKeyFromUtcIso } from "@/features/calendars/utils/timezone";
import { CALENDAR_GRID } from "@/features/calendars/utils/calendar-grid-styles";
import { WorkingHoursOverlays } from "@/features/appointments/components/calendar/working-hours-overlays";
import { useCalendarDisplayRuntime } from "@/features/calendar-display-settings/context/calendar-display-runtime-context";
import type { BusinessHoursSlot } from "@/features/business-hours/types";
import { defaultBusinessHoursSlots } from "@/features/business-hours/utils/default-business-hours";
import { cn } from "@/lib/utils";

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
  showBufferOnCalendar?: boolean;
  bufferTimeEnabled?: boolean;
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
  highlightToday: _highlightToday = true,
  onAppointmentClick,
  onAppointmentMoveStart,
  onAppointmentResizeStart,
  draggingAppointmentId,
  businessHoursSlots,
  staffHoursSlots,
  showBufferOnCalendar = false,
  bufferTimeEnabled = true,
  onSlotClick,
}: TimeGridColumnProps) {
  const { slotHeightPx, visibleStartHour, visibleEndHour } =
    useCalendarDisplayRuntime();
  const gridHeight = getTimeGridHeight(
    visibleStartHour,
    visibleEndHour,
    CALENDAR_SLOT_MINUTES,
    slotHeightPx,
  );
  const slotLabels = getTimeSlotLabels(
    visibleStartHour,
    visibleEndHour,
    CALENDAR_SLOT_MINUTES,
  );
  const resolvedBusinessHours = businessHoursSlots?.length
    ? businessHoursSlots
    : defaultBusinessHoursSlots();

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
    if (y < 0 || y >= gridHeight) return;

    const slotIndex = Math.floor(y / slotHeightPx);
    const minutes = slotLabels[slotIndex];
    if (minutes === undefined) return;

    onSlotClick(dateKey, Math.floor(minutes / 60), minutes % 60, staffUserId);
  };

  return (
    <div
      className={cn(
        "relative min-w-0 cursor-pointer overflow-hidden bg-white",
        CALENDAR_GRID.column,
      )}
      style={{ height: gridHeight }}
      onClick={handleColumnClick}
      role="presentation"
    >
      {slotLabels.map((minutes) => (
        <div
          key={minutes}
          className={cn(
            "pointer-events-none w-full hover:bg-[#F6F1FE]/40",
            minutes % 60 === 45 ? CALENDAR_GRID.slotHour : CALENDAR_GRID.slot,
          )}
          style={{ height: slotHeightPx }}
          aria-hidden
        />
      ))}
      <WorkingHoursOverlays
        dateKey={dateKey}
        timezone={viewTimezone}
        businessSlots={resolvedBusinessHours}
        staffSlots={staffHoursSlots}
      />
      <TimeGridBufferBands
        appointments={dayAppointments}
        viewTimezone={viewTimezone}
        showBufferOnCalendar={showBufferOnCalendar}
        bufferTimeEnabled={bufferTimeEnabled}
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

export function TimeGridGutter({ className }: { className?: string }) {
  const { slotHeightPx, visibleStartHour, visibleEndHour } =
    useCalendarDisplayRuntime();
  const slotLabels = getTimeSlotLabels(
    visibleStartHour,
    visibleEndHour,
    CALENDAR_SLOT_MINUTES,
  );
  return (
    <div className={cn(CALENDAR_GRID.timeGutter, "bg-white", className)}>
      {slotLabels.map((minutes) => {
        const isHourStart = minutes % 60 === 0;
        const isHourEnd = minutes % 60 === 45;
        return (
          <div
            key={minutes}
            className={cn(
              "box-border flex items-start justify-center bg-transparent px-0 pt-2 text-center text-[11px] font-medium leading-none text-[#6B6B6B]",
              // Hour separators only — no 15-min grid through the time labels
              isHourEnd ? CALENDAR_GRID.slotHour : "border-b border-transparent",
            )}
            style={{ height: slotHeightPx }}
          >
            {isHourStart ? minutesToTimeLabel(minutes) : ""}
          </div>
        );
      })}
    </div>
  );
}

export function useTimeGridHeight(): number {
  const { slotHeightPx, visibleStartHour, visibleEndHour } =
    useCalendarDisplayRuntime();
  return getTimeGridHeight(
    visibleStartHour,
    visibleEndHour,
    CALENDAR_SLOT_MINUTES,
    slotHeightPx,
  );
}
