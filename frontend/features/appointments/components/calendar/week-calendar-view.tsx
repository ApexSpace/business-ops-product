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
  getWeekDateKeysInTimezone,
  isTodayDateKey,
  parseDateKeyInTimezone,
} from "@/features/calendars/utils/timezone";
import { CALENDAR_GRID } from "@/features/calendars/utils/calendar-grid-styles";
import { cn } from "@/lib/utils";

interface WeekCalendarViewProps {
  anchorDateKey: string;
  timezone: string;
  calendars?: Calendar[];
  businessTimezone?: string | null;
  appointments: Appointment[];
  isLoading?: boolean;
  className?: string;
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
  onSlotClick: (
    dateKey: string,
    hour: number,
    minute: number,
    assignedToId?: string,
  ) => void;
}

export function WeekCalendarView({
  anchorDateKey,
  timezone,
  calendars,
  businessTimezone,
  appointments,
  isLoading,
  className,
  onAppointmentClick,
  onAppointmentMoveStart,
  onAppointmentResizeStart,
  draggingAppointmentId,
  onSlotClick,
}: WeekCalendarViewProps) {
  const weekDateKeys = getWeekDateKeysInTimezone(anchorDateKey, timezone);
  const currentTimeTop = useCalendarCurrentTimeTop(timezone, weekDateKeys);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-card shadow-elevation-xs",
        CALENDAR_GRID.card,
        className,
      )}
    >
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="max-h-[min(75vh,840px)] overflow-auto">
            <div
              className={cn(
                "sticky top-0 z-20 grid bg-card",
                CALENDAR_GRID.headerRow,
              )}
              style={{ gridTemplateColumns: `56px repeat(7, minmax(0, 1fr))` }}
            >
              <div />
              {weekDateKeys.map((dayKey) => {
                const isToday = isTodayDateKey(dayKey, timezone);
                const dayNumber = parseDateKeyInTimezone(dayKey, timezone).day;

                return (
                  <div
                    key={dayKey}
                    className={cn(
                      CALENDAR_GRID.column,
                      "px-2 py-2.5 text-center",
                      isToday && "bg-primary/[0.04]",
                    )}
                  >
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {formatShortWeekdayForDateKey(dayKey, timezone)}
                    </span>
                    <span
                      className={cn(
                        "mx-auto mt-1 inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold",
                        isToday
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground",
                      )}
                    >
                      {dayNumber}
                    </span>
                  </div>
                );
              })}
            </div>
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
                      onAppointmentMoveStart={onAppointmentMoveStart}
                      onAppointmentResizeStart={onAppointmentResizeStart}
                      draggingAppointmentId={draggingAppointmentId}
                      onSlotClick={onSlotClick}
                    />
                  ))}
                </div>
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
