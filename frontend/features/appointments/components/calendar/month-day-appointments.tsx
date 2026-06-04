"use client";

import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import { AppointmentEventCard } from "@/features/appointments/components/calendar/appointment-event-card";
import { AppointmentMorePopover } from "@/features/appointments/components/calendar/appointment-more-popover";
import { MONTH_MAX_VISIBLE_EVENTS } from "@/features/calendars/utils/calendar-dates";
import type { Calendar } from "@/features/calendars/schemas/calendar-profile";
import { resolveTimezoneForAppointment } from "@/features/calendars/utils/timezone";

interface MonthDayAppointmentsProps {
  appointments: Appointment[];
  calendars?: Calendar[];
  businessTimezone?: string | null;
  onAppointmentClick: (appointment: Appointment) => void;
}

export function MonthDayAppointments({
  appointments,
  calendars,
  businessTimezone,
  onAppointmentClick,
}: MonthDayAppointmentsProps) {
  const visible = appointments.slice(0, MONTH_MAX_VISIBLE_EVENTS);
  const overflow = appointments.slice(MONTH_MAX_VISIBLE_EVENTS);

  return (
    <>
      {visible.map((apt) => {
        const tz = resolveTimezoneForAppointment(
          apt.calendarId,
          calendars,
          businessTimezone,
        );
        return (
          <div
            key={apt.id}
            className="min-h-0 shrink-0"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <AppointmentEventCard
              appointment={apt}
              timeZone={tz}
              compact
              ultraCompact
              className="shadow-elevation-xs transition-shadow hover:shadow-md"
              onClick={() => onAppointmentClick(apt)}
            />
          </div>
        );
      })}
      {overflow.length > 0 ? (
        <div
          className="shrink-0"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <AppointmentMorePopover
            appointments={overflow}
            calendars={calendars}
            businessTimezone={businessTimezone}
            label={`+${overflow.length} more`}
            title="More appointments"
            onAppointmentClick={onAppointmentClick}
            triggerClassName="w-full"
          />
        </div>
      ) : null}
    </>
  );
}
