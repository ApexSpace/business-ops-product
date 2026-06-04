"use client";

import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import { MonthDayAppointments } from "@/features/appointments/components/calendar/month-day-appointments";
import type { Calendar } from "@/features/calendars/schemas/calendar-profile";
import {
  getMonthGridDateKeysInTimezone,
  groupAppointmentsByCalendarTimezone,
  isTodayDateKey,
  parseDateKeyInTimezone,
} from "@/features/calendars/utils/timezone";
import { CALENDAR_GRID } from "@/features/calendars/utils/calendar-grid-styles";
import { cn } from "@/lib/utils";

interface MonthCalendarViewProps {
  anchorDateKey: string;
  timezone: string;
  calendars?: Calendar[];
  businessTimezone?: string | null;
  appointments: Appointment[];
  isLoading?: boolean;
  onAppointmentClick: (appointment: Appointment) => void;
  onDayClick: (dateKey: string) => void;
}

export function MonthCalendarView({
  anchorDateKey,
  timezone,
  calendars,
  businessTimezone,
  appointments,
  isLoading,
  onAppointmentClick,
  onDayClick,
}: MonthCalendarViewProps) {
  const gridDateKeys = getMonthGridDateKeysInTimezone(anchorDateKey, timezone);
  const anchorMonth = parseDateKeyInTimezone(anchorDateKey, timezone).month;
  const byDay = groupAppointmentsByCalendarTimezone(
    appointments,
    calendars,
    businessTimezone,
  );
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-card shadow-elevation-xs",
        CALENDAR_GRID.card,
      )}
    >
      <div className={cn("grid grid-cols-7 bg-muted/20", CALENDAR_GRID.headerRow)}>
        {weekdays.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Loading appointments…
        </div>
      ) : (
        <div className="grid grid-cols-7">
          {gridDateKeys.map((dayKey) => {
            const dayAppointments = byDay.get(dayKey) ?? [];
            const dayDt = parseDateKeyInTimezone(dayKey, timezone);
            const inCurrentMonth = dayDt.month === anchorMonth;

            return (
              <div
                key={dayKey}
                role="button"
                tabIndex={0}
                onClick={() => onDayClick(dayKey)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onDayClick(dayKey);
                  }
                }}
                className={cn(
                  "flex min-h-[100px] cursor-pointer flex-col p-1.5 text-left transition-colors hover:bg-muted/30 sm:min-h-[120px]",
                  CALENDAR_GRID.monthCell,
                  !inCurrentMonth && "bg-muted/10 text-muted-foreground",
                  isTodayDateKey(dayKey, timezone) && "bg-primary/[0.04]",
                )}
              >
                <span
                  className={cn(
                    "mb-1 inline-flex size-7 items-center justify-center rounded-full text-sm",
                    isTodayDateKey(dayKey, timezone) &&
                      "bg-primary font-semibold text-primary-foreground",
                  )}
                >
                  {dayDt.day}
                </span>
                <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                  <MonthDayAppointments
                    appointments={dayAppointments}
                    calendars={calendars}
                    businessTimezone={businessTimezone}
                    onAppointmentClick={onAppointmentClick}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!isLoading && appointments.length === 0 ? (
        <p
          className={cn(
            "px-4 py-3 text-center text-sm text-muted-foreground",
            CALENDAR_GRID.footer,
          )}
        >
          No appointments this month. Click a day or use New appointment.
        </p>
      ) : null}
    </div>
  );
}
