"use client";

import { useCallback, useMemo } from "react";
import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import { AppointmentEventCard } from "@/features/appointments/components/calendar/appointment-event-card";
import { AppointmentMorePopover } from "@/features/appointments/components/calendar/appointment-more-popover";
import { CALENDAR_EVENT_MIN_HEIGHT_PX } from "@/features/calendars/utils/calendar-dates";
import type { Calendar } from "@/features/calendars/schemas/calendar-profile";
import {
  OVERLAP_LAYOUT_GAP_PX,
  layoutOverlappingAppointments,
  type TimeGridAppointmentLayout,
} from "@/features/appointments/utils/appointment-overlap";
import { resolveTimezoneForAppointment } from "@/features/calendars/utils/timezone";
import { cn } from "@/lib/utils";

interface TimeGridAppointmentsProps {
  appointments: Appointment[];
  viewTimezone: string;
  calendars?: Calendar[];
  businessTimezone?: string | null;
  onAppointmentClick: (appointment: Appointment) => void;
}

function layoutStyle(item: TimeGridAppointmentLayout): React.CSSProperties {
  const gap = OVERLAP_LAYOUT_GAP_PX;
  const left = `calc(${item.leftPercent}% + ${gap / 2}px)`;
  const width = `calc(${item.widthPercent}% - ${gap}px)`;

  return {
    top: item.top,
    height: Math.max(item.height, CALENDAR_EVENT_MIN_HEIGHT_PX),
    left,
    width,
  };
}

export function TimeGridAppointments({
  appointments,
  viewTimezone,
  calendars,
  businessTimezone,
  onAppointmentClick,
}: TimeGridAppointmentsProps) {
  const resolveEventTimezone = useCallback(
    (appointment: Appointment) =>
      resolveTimezoneForAppointment(
        appointment.calendarId,
        calendars,
        businessTimezone,
      ),
    [calendars, businessTimezone],
  );

  const layouts = useMemo(
    () =>
      layoutOverlappingAppointments(appointments, {
        timezone: viewTimezone,
        resolveEventTimezone,
      }),
    [appointments, viewTimezone, resolveEventTimezone],
  );

  return (
    <>
      {layouts.map((item) => {
        if (item.type === "more") {
          return (
            <div
              key={`more-${item.appointments.map((a) => a.id).join("-")}-${item.top}`}
              className="pointer-events-none absolute z-20"
              style={layoutStyle(item)}
            >
              <div className="pointer-events-auto flex h-full min-h-[28px] items-stretch">
                <AppointmentMorePopover
                  appointments={item.appointments}
                  calendars={calendars}
                  businessTimezone={businessTimezone}
                  label={`+${item.appointments.length} more`}
                  title="Overlapping appointments"
                  onAppointmentClick={onAppointmentClick}
                  triggerClassName="flex h-full min-h-[28px] items-center justify-center px-1 text-[10px]"
                  side="right"
                />
              </div>
            </div>
          );
        }

        const eventTimezone = resolveEventTimezone(item.appointment);
        const besideMore = item.columnCount > 1;
        const compact = besideMore || item.height < 60;
        const ultraCompact = !besideMore && item.height < 48;

        return (
          <div
            key={item.appointment.id}
            className="pointer-events-none absolute z-10"
            style={layoutStyle(item)}
          >
            <div className="pointer-events-auto h-full min-h-0">
              <AppointmentEventCard
                appointment={item.appointment}
                timeZone={eventTimezone}
                compact={compact}
                ultraCompact={ultraCompact}
                className={cn(
                  "h-full min-h-0 shadow-elevation-xs transition-shadow hover:shadow-md",
                )}
                onClick={() => onAppointmentClick(item.appointment)}
              />
            </div>
          </div>
        );
      })}
    </>
  );
}
