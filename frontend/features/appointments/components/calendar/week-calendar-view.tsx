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
import {
  CALENDAR_FIGMA_STAFF_COL_MIN_PX,
  CALENDAR_FIGMA_TIME_GUTTER_PX,
} from "@/features/calendars/styles/calendar-figma";
import type { BusinessHoursSlot } from "@/features/business-hours/types";
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
  businessHoursSlots?: BusinessHoursSlot[];
  weekStaffHoursSlots?: BusinessHoursSlot[] | null;
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
  businessHoursSlots,
  weekStaffHoursSlots,
  onSlotClick,
}: WeekCalendarViewProps) {
  const weekDateKeys = getWeekDateKeysInTimezone(anchorDateKey, timezone);
  const currentTimeTop = useCalendarCurrentTimeTop(timezone, weekDateKeys);
  const gridTemplate = `${CALENDAR_FIGMA_TIME_GUTTER_PX}px repeat(7, minmax(${CALENDAR_FIGMA_STAFF_COL_MIN_PX}px, 1fr))`;
  const minWidth =
    CALENDAR_FIGMA_TIME_GUTTER_PX + 7 * CALENDAR_FIGMA_STAFF_COL_MIN_PX;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-white",
        CALENDAR_GRID.card,
        className,
      )}
    >
      {/* Single scroll host — avoids stacked horizontal scrollbars */}
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain bg-white">
        <div className="min-w-0 bg-white" style={{ minWidth }}>
          <div
            className={cn(
              "sticky top-0 z-30 grid bg-white",
              CALENDAR_GRID.headerRow,
            )}
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <div
              className="sticky left-0 z-40 shrink-0 border-b border-r border-[color:rgba(126,59,237,0.6)] bg-white"
              style={{ width: CALENDAR_FIGMA_TIME_GUTTER_PX, height: 64 }}
              aria-hidden
            />
            {weekDateKeys.map((dayKey) => {
              const isToday = isTodayDateKey(dayKey, timezone);
              const dayNumber = parseDateKeyInTimezone(dayKey, timezone).day;

              return (
                <div
                  key={dayKey}
                  className={cn(
                    CALENDAR_GRID.column,
                    "flex h-16 flex-col items-center justify-center bg-white px-2 py-2",
                  )}
                >
                  <span className="block text-[10px] font-semibold uppercase leading-none tracking-wide text-grey-tertiary-normal">
                    {formatShortWeekdayForDateKey(dayKey, timezone)}
                  </span>
                  <span
                    className={cn(
                      "mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold leading-none",
                      isToday
                        ? "bg-[#7E3BED] text-white"
                        : "text-black-secondary-normal",
                    )}
                  >
                    {dayNumber}
                  </span>
                </div>
              );
            })}
          </div>
          {isLoading ? (
            <div className="flex h-48 items-center justify-center text-sm text-grey-tertiary-normal">
              Loading appointments…
            </div>
          ) : (
            <div
              className="relative bg-white"
              style={{ minHeight: GRID_HEIGHT }}
            >
              {currentTimeTop !== null ? (
                <CalendarCurrentTimeIndicator topPx={currentTimeTop} />
              ) : null}
              <div
                className="grid bg-white"
                style={{
                  gridTemplateColumns: gridTemplate,
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
                    businessHoursSlots={businessHoursSlots}
                    staffHoursSlots={weekStaffHoursSlots}
                    onSlotClick={onSlotClick}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
