"use client";

import type { Appointment } from "@/lib/appointment-profile";
import type { Calendar } from "@/lib/calendar-profile";
import {
  GRID_HEIGHT,
  TimeGridColumn,
  TimeGridGutter,
} from "@/components/appointments/calendar/time-grid-shared";
import {
  formatDayMonthForDateKey,
  formatShortWeekdayForDateKey,
  getWeekDateKeysInTimezone,
  isTodayDateKey,
} from "@/lib/timezone";
import { CALENDAR_GRID } from "@/lib/calendar-grid-styles";
import { cn } from "@/lib/utils";

interface WeekCalendarViewProps {
  anchorDateKey: string;
  timezone: string;
  calendars?: Calendar[];
  businessTimezone?: string | null;
  appointments: Appointment[];
  isLoading?: boolean;
  onAppointmentClick: (appointment: Appointment) => void;
  onSlotClick: (dateKey: string, hour: number, minute: number) => void;
}

export function WeekCalendarView({
  anchorDateKey,
  timezone,
  calendars,
  businessTimezone,
  appointments,
  isLoading,
  onAppointmentClick,
  onSlotClick,
}: WeekCalendarViewProps) {
  const weekDateKeys = getWeekDateKeysInTimezone(anchorDateKey, timezone);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-card shadow-elevation-xs",
        CALENDAR_GRID.card,
      )}
    >
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div
            className={cn("grid bg-muted/20", CALENDAR_GRID.headerRow)}
            style={{ gridTemplateColumns: `56px repeat(7, minmax(0, 1fr))` }}
          >
            <div />
            {weekDateKeys.map((dayKey) => (
              <div
                key={dayKey}
                className={cn(
                  CALENDAR_GRID.column,
                  "px-2 py-2 text-center text-sm",
                  isTodayDateKey(dayKey, timezone) &&
                    "bg-primary/[0.06] font-semibold text-primary",
                )}
              >
                <span className="block text-xs text-muted-foreground">
                  {formatShortWeekdayForDateKey(dayKey, timezone)}
                </span>
                {formatDayMonthForDateKey(dayKey, timezone)}
              </div>
            ))}
          </div>
          <div className="max-h-[min(70vh,720px)] overflow-auto">
            {isLoading ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Loading appointments…
              </div>
            ) : (
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `56px repeat(7, minmax(0, 1fr))`,
                  minHeight: GRID_HEIGHT,
                }}
              >
                <TimeGridGutter />
                {weekDateKeys.map((dayKey) => (
                  <TimeGridColumn
                    key={dayKey}
                    dateKey={dayKey}
                    appointments={appointments}
                    viewTimezone={timezone}
                    calendars={calendars}
                    businessTimezone={businessTimezone}
                    onAppointmentClick={onAppointmentClick}
                    onSlotClick={onSlotClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {!isLoading && appointments.length === 0 ? (
        <p
          className={cn(
            "px-4 py-3 text-center text-sm text-muted-foreground",
            CALENDAR_GRID.footer,
          )}
        >
          No appointments this week. Click a time slot to create one.
        </p>
      ) : null}
    </div>
  );
}
