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
import { getMobileWeekDateKeys } from "@/features/calendar-display-settings/utils/calendar-display-runtime.util";
import type { WeekStartsOn } from "@/features/calendar-display-settings/api/calendar-display-settings.api";
import {
  formatShortWeekdayForDateKey,
  getWeekDateKeysInTimezone,
  isTodayDateKey,
  parseDateKeyInTimezone,
} from "@/features/calendars/utils/timezone";
import { CALENDAR_GRID } from "@/features/calendars/utils/calendar-grid-styles";
import { calendarTimeGridLayout } from "@/features/calendars/utils/calendar-time-grid-layout";
import { LoadingState } from "@/components/data-display/loading-state";
import {
  CALENDAR_FIGMA_DAY_HEADER_HEIGHT_PX,
  CALENDAR_FIGMA_TIME_GUTTER_PX,
} from "@/features/calendars/styles/calendar-figma";
import {
  MOBILE_CAL_COL_WIDTH_PX,
  MOBILE_CAL_TIME_GUTTER_PX,
  MOBILE_CAL_WEEK_VISIBLE_DAYS,
} from "@/features/appointments/styles/mobile-calendar-tokens";
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
  showBufferOnCalendar?: boolean;
  bufferTimeEnabled?: boolean;
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
  /** Figma phone week — Mon–Wed columns only. */
  density?: "desktop" | "mobile";
  weekStartsOn?: WeekStartsOn;
}

export function WeekCalendarView({
  anchorDateKey,
  timezone,
  calendars,
  businessTimezone,
  appointments,
  isLoading,
  className,
  showBufferOnCalendar,
  bufferTimeEnabled,
  onAppointmentClick,
  onAppointmentMoveStart,
  onAppointmentResizeStart,
  draggingAppointmentId,
  businessHoursSlots,
  weekStaffHoursSlots,
  onSlotClick,
  density = "desktop",
  weekStartsOn = "SUNDAY",
}: WeekCalendarViewProps) {
  const isMobile = density === "mobile";
  const gridHeight = useTimeGridHeight();
  const allWeekKeys = getWeekDateKeysInTimezone(
    anchorDateKey,
    timezone,
    weekStartsOn,
  );
  const weekDateKeys = isMobile
    ? getMobileWeekDateKeys(
        allWeekKeys,
        weekStartsOn,
        MOBILE_CAL_WEEK_VISIBLE_DAYS,
      )
    : allWeekKeys;
  const currentTimeTop = useCalendarCurrentTimeTop(timezone, weekDateKeys);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickyHeaderHeight = CALENDAR_FIGMA_DAY_HEADER_HEIGHT_PX;
  useScrollTimeGridToNow(scrollRef, {
    currentTimeTopPx: currentTimeTop,
    stickyHeaderHeight,
    enabled: !isLoading,
    resetKey: `${density}:${weekDateKeys.join(",")}`,
  });
  const timeGutterPx = isMobile
    ? MOBILE_CAL_TIME_GUTTER_PX
    : CALENDAR_FIGMA_TIME_GUTTER_PX;
  const columnCount = weekDateKeys.length;
  const { gridTemplateColumns, frameStyle } = calendarTimeGridLayout({
    gutterPx: timeGutterPx,
    columnCount,
    columnMinPx: MOBILE_CAL_COL_WIDTH_PX,
    mode: isMobile ? "fixed" : "fluid",
  });

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-white",
        CALENDAR_GRID.card,
        className,
      )}
    >
      {/* Single scroll host — avoids stacked horizontal scrollbars */}
      <div
        ref={scrollRef}
        className={cn(
          "min-h-0 flex-1 overscroll-contain bg-white",
          isMobile ? "overflow-auto" : "overflow-x-hidden overflow-y-auto",
        )}
      >
        <div className="min-w-0 bg-white" style={frameStyle}>
          <div
            className={cn(
              "sticky top-0 z-30 grid w-full bg-white",
              CALENDAR_GRID.headerRow,
            )}
            style={{ gridTemplateColumns }}
          >
            <div
              className={CALENDAR_GRID.dayHeaderCorner}
              style={{ width: timeGutterPx }}
              aria-hidden
            />
            {weekDateKeys.map((dayKey) => (
              <CalendarDayColumnHeader
                key={dayKey}
                weekday={formatShortWeekdayForDateKey(dayKey, timezone)}
                dayNumber={parseDateKeyInTimezone(dayKey, timezone).day}
                isToday={isTodayDateKey(dayKey, timezone)}
              />
            ))}
          </div>
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <LoadingState variant="inline" label="Loading appointments…" />
            </div>
          ) : (
            <div
              className="relative bg-white"
              style={{ minHeight: gridHeight }}
            >
              {currentTimeTop !== null ? (
                <CalendarCurrentTimeIndicator topPx={currentTimeTop} />
              ) : null}
              <div
                className="grid w-full bg-white"
                style={{
                  gridTemplateColumns,
                  minHeight: gridHeight,
                }}
              >
                <TimeGridGutter className={isMobile ? "w-[52px]" : undefined} />
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
                    showBufferOnCalendar={showBufferOnCalendar}
                    bufferTimeEnabled={bufferTimeEnabled}
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
