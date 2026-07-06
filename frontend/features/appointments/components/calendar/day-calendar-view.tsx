"use client";

import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import type { Calendar } from "@/features/calendars/schemas/calendar-profile";
import { CalendarCurrentTimeIndicator } from "@/features/appointments/components/calendar/calendar-current-time-indicator";
import {
  GRID_HEIGHT,
  TimeGridColumn,
  TimeGridGutter,
} from "@/features/appointments/components/calendar/time-grid-shared";
import { useCalendarCurrentTimeTop } from "@/features/appointments/hooks/use-calendar-current-time";
import {
  formatShortWeekdayForDateKey,
  isTodayDateKey,
  parseDateKeyInTimezone,
} from "@/features/calendars/utils/timezone";
import { CALENDAR_GRID } from "@/features/calendars/utils/calendar-grid-styles";
import { cn } from "@/lib/utils";

interface DayCalendarViewProps {
  dateKey: string;
  timezone: string;
  calendars?: Calendar[];
  businessTimezone?: string | null;
  appointments: Appointment[];
  isLoading?: boolean;
  onAppointmentClick: (appointment: Appointment) => void;
  onSlotClick: (dateKey: string, hour: number, minute: number) => void;
}

export function DayCalendarView({
  dateKey,
  timezone,
  calendars,
  businessTimezone,
  appointments,
  isLoading,
  onAppointmentClick,
  onSlotClick,
}: DayCalendarViewProps) {
  const isToday = isTodayDateKey(dateKey, timezone);
  const dayNumber = parseDateKeyInTimezone(dateKey, timezone).day;
  const currentTimeTop = useCalendarCurrentTimeTop(timezone, [dateKey]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-card shadow-elevation-xs",
        CALENDAR_GRID.card,
      )}
    >
      <div
        className={cn(
          "grid grid-cols-[56px_1fr] bg-muted/20",
          CALENDAR_GRID.headerRow,
        )}
      >
        <div />
        <div
          className={cn(
            CALENDAR_GRID.column,
            "px-3 py-2.5 text-center sm:text-left",
            isToday && "bg-primary/[0.04]",
          )}
        >
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {formatShortWeekdayForDateKey(dateKey, timezone)}
          </span>
          <span
            className={cn(
              "mt-1 inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold",
              isToday
                ? "bg-primary text-primary-foreground"
                : "text-foreground",
            )}
          >
            {dayNumber}
          </span>
        </div>
      </div>
      <div className="max-h-[min(75vh,840px)] overflow-auto">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            Loading appointments…
          </div>
        ) : (
          <div className="relative" style={{ minHeight: GRID_HEIGHT }}>
            {currentTimeTop !== null ? (
              <CalendarCurrentTimeIndicator topPx={currentTimeTop} />
            ) : null}
            <div
              className="grid grid-cols-[56px_1fr]"
              style={{ minHeight: GRID_HEIGHT }}
            >
              <TimeGridGutter />
              <TimeGridColumn
                dateKey={dateKey}
                appointments={appointments}
                viewTimezone={timezone}
                calendars={calendars}
                businessTimezone={businessTimezone}
                onAppointmentClick={onAppointmentClick}
                onSlotClick={onSlotClick}
              />
            </div>
          </div>
        )}
      </div>
      {!isLoading && appointments.length === 0 ? (
        <p
          className={cn(
            "px-4 py-3 text-center text-sm text-muted-foreground",
            CALENDAR_GRID.footer,
          )}
        >
          No appointments this day. Click a time slot to schedule one.
        </p>
      ) : null}
    </div>
  );
}
