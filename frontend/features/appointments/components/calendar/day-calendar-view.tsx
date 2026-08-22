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
import { LoadingState } from "@/components/data-display/loading-state";
import { cn } from "@/lib/utils";

interface DayCalendarViewProps {
  dateKey: string;
  timezone: string;
  calendars?: Calendar[];
  businessTimezone?: string | null;
  appointments: Appointment[];
  isLoading?: boolean;
  onAppointmentClick: (appointment: Appointment) => void;
  onSlotClick: (
    dateKey: string,
    hour: number,
    minute: number,
    assignedToId?: string,
  ) => void;
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
    <div className={cn("overflow-hidden bg-white", CALENDAR_GRID.card)}>
      <div
        className={cn(
          "grid grid-cols-[80px_1fr]",
          CALENDAR_GRID.headerRow,
        )}
      >
        <div className="sticky left-0 z-40 w-20 bg-white" aria-hidden />
        <div
          className={cn(
            CALENDAR_GRID.column,
            "flex h-12 items-center justify-center bg-white px-3 py-2 sm:h-14 sm:justify-start",
          )}
        >
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-grey-tertiary-normal">
            {formatShortWeekdayForDateKey(dateKey, timezone)}
          </span>
          <span
            className={cn(
              "ml-2 inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold",
              isToday
                ? "bg-[#7E3BED] text-white"
                : "text-black-secondary-normal",
            )}
          >
            {dayNumber}
          </span>
        </div>
      </div>
      <div className="max-h-[min(75vh,844px)] overflow-auto">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <LoadingState variant="inline" label="Loading appointments…" />
          </div>
        ) : (
          <div className="relative" style={{ minHeight: GRID_HEIGHT }}>
            {currentTimeTop !== null ? (
              <CalendarCurrentTimeIndicator topPx={currentTimeTop} />
            ) : null}
            <div
              className="grid grid-cols-[80px_1fr]"
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
    </div>
  );
}
