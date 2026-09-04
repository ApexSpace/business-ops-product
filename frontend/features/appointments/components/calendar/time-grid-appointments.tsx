"use client";

import { useCallback, useMemo } from "react";
import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import { AppointmentEventCard } from "@/features/appointments/components/calendar/appointment-event-card";
import { AppointmentMorePopover } from "@/features/appointments/components/calendar/appointment-more-popover";
import { CALENDAR_EVENT_MIN_HEIGHT_PX } from "@/features/calendars/utils/calendar-dates";
import { useCalendarDisplayRuntime } from "@/features/calendar-display-settings/context/calendar-display-runtime-context";
import type { Calendar } from "@/features/calendars/schemas/calendar-profile";
import {
  OVERLAP_LAYOUT_GAP_PX,
  layoutOverlappingAppointments,
  type TimeGridAppointmentLayout,
} from "@/features/appointments/utils/appointment-overlap";

interface TimeGridAppointmentsProps {
  appointments: Appointment[];
  viewTimezone: string;
  calendars?: Calendar[];
  businessTimezone?: string | null;
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
}

function layoutStyle(item: TimeGridAppointmentLayout): React.CSSProperties {
  const gap = OVERLAP_LAYOUT_GAP_PX;
  const left = `calc(${item.leftPercent}% + ${gap / 2}px)`;
  const width = `calc(${item.widthPercent}% - ${gap}px)`;
  const height = Math.max(item.height, CALENDAR_EVENT_MIN_HEIGHT_PX);

  return {
    top: item.top,
    height,
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
  onAppointmentMoveStart,
  onAppointmentResizeStart,
  draggingAppointmentId,
}: TimeGridAppointmentsProps) {
  const { slotHeightPx, visibleStartHour, visibleEndHour } =
    useCalendarDisplayRuntime();
  const resolveEventTimezone = useCallback(
    (_appointment: Appointment) => viewTimezone,
    [viewTimezone],
  );

  const layouts = useMemo(
    () =>
      layoutOverlappingAppointments(appointments, {
        timezone: viewTimezone,
        resolveEventTimezone,
        slotHeightPx,
        dayStartHour: visibleStartHour,
        dayEndHour: visibleEndHour,
      }),
    [
      appointments,
      viewTimezone,
      resolveEventTimezone,
      slotHeightPx,
      visibleStartHour,
      visibleEndHour,
    ],
  );

  return (
    <>
      {layouts.map((item) => {
        if (item.type === "more") {
          return (
            <div
              key={`more-${item.appointments.map((a) => a.id).join("-")}-${item.top}`}
              className="pointer-events-none absolute z-10 px-0.5"
              style={layoutStyle(item)}
            >
              <div className="pointer-events-auto flex h-full min-h-[36px] items-stretch">
                <AppointmentMorePopover
                  appointments={item.appointments}
                  calendars={calendars}
                  businessTimezone={businessTimezone}
                  timezone={viewTimezone}
                  label={`+${item.appointments.length} more`}
                  title="Overlapping appointments"
                  onAppointmentClick={onAppointmentClick}
                  triggerClassName="flex h-full min-h-[36px] w-full items-center justify-center rounded-md border border-primary/30 bg-primary/10 px-1.5 text-[10px] font-medium text-primary"
                  side="right"
                />
              </div>
            </div>
          );
        }

        const eventTimezone = resolveEventTimezone(item.appointment);
        const height = Math.max(item.height, CALENDAR_EVENT_MIN_HEIGHT_PX);

        return (
          <div
            key={item.appointment.id}
            className="pointer-events-none absolute z-10 px-0.5 py-0.5"
            style={layoutStyle(item)}
          >
            <div className="pointer-events-auto h-full min-h-0">
              <AppointmentEventCard
                appointment={item.appointment}
                timeZone={eventTimezone}
                variant="grid"
                eventHeight={height}
                className="shadow-elevation-xs"
                onClick={() => onAppointmentClick(item.appointment)}
                onMoveStart={
                  onAppointmentMoveStart
                    ? (event) => onAppointmentMoveStart(item.appointment, event)
                    : undefined
                }
                onResizeStart={
                  onAppointmentResizeStart
                    ? (event) =>
                        onAppointmentResizeStart(item.appointment, event)
                    : undefined
                }
                isDragging={draggingAppointmentId === item.appointment.id}
              />
            </div>
          </div>
        );
      })}
    </>
  );
}
