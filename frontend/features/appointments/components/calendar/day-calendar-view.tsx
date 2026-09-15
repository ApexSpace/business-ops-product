"use client";

import { useRef } from "react";
import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import type { Calendar } from "@/features/calendars/schemas/calendar-profile";
import { CalendarCurrentTimeIndicator } from "@/features/appointments/components/calendar/calendar-current-time-indicator";
import { CalendarDayColumnHeader } from "@/features/appointments/components/calendar/calendar-day-column-header";
import {
  TimeGridColumn,
  TimeGridGutter,
  useTimeGridHeight,
} from "@/features/appointments/components/calendar/time-grid-shared";
import { useCalendarCurrentTimeTop } from "@/features/appointments/hooks/use-calendar-current-time";
import { useScrollTimeGridToNow } from "@/features/appointments/hooks/use-scroll-time-grid-to-now";
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
  showBufferOnCalendar?: boolean;
  bufferTimeEnabled?: boolean;
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
  showBufferOnCalendar,
  bufferTimeEnabled,
  onAppointmentClick,
  onSlotClick,
}: DayCalendarViewProps) {
  const gridHeight = useTimeGridHeight();
  const isToday = isTodayDateKey(dateKey, timezone);
  const dayNumber = parseDateKeyInTimezone(dateKey, timezone).day;
  const currentTimeTop = useCalendarCurrentTimeTop(timezone, [dateKey]);
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollTimeGridToNow(scrollRef, {
    currentTimeTopPx: currentTimeTop,
    stickyHeaderHeight: 0,
    enabled: !isLoading,
    resetKey: dateKey,
  });

  return (
    <div className={cn("overflow-hidden bg-white", CALENDAR_GRID.card)}>
      <div
        className={cn(
          "grid grid-cols-[80px_1fr]",
          CALENDAR_GRID.headerRow,
        )}
      >
        <div
          className={cn(CALENDAR_GRID.dayHeaderCorner, "w-20")}
          aria-hidden
        />
        <CalendarDayColumnHeader
          orientation="row"
          weekday={formatShortWeekdayForDateKey(dateKey, timezone)}
          dayNumber={dayNumber}
          isToday={isToday}
        />
      </div>
      <div ref={scrollRef} className="max-h-[min(75vh,844px)] overflow-auto">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <LoadingState variant="inline" label="Loading appointments…" />
          </div>
        ) : (
          <div className="relative" style={{ minHeight: gridHeight }}>
            {currentTimeTop !== null ? (
              <CalendarCurrentTimeIndicator topPx={currentTimeTop} />
            ) : null}
            <div
              className="grid grid-cols-[80px_1fr]"
              style={{ minHeight: gridHeight }}
            >
              <TimeGridGutter />
              <TimeGridColumn
                dateKey={dateKey}
                appointments={appointments}
                viewTimezone={timezone}
                calendars={calendars}
                businessTimezone={businessTimezone}
                showBufferOnCalendar={showBufferOnCalendar}
                bufferTimeEnabled={bufferTimeEnabled}
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
