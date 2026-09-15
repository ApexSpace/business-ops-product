"use client";

import { CALENDAR_GRID } from "@/features/calendars/utils/calendar-grid-styles";
import { cn } from "@/lib/utils";

interface CalendarDayColumnHeaderProps {
  weekday: string;
  dayNumber: number;
  isToday?: boolean;
  /** Week grid stacks the label; day view sits on one row. */
  orientation?: "stack" | "row";
  className?: string;
}

/** Shared WED / 26 header used by week and day time grids. */
export function CalendarDayColumnHeader({
  weekday,
  dayNumber,
  isToday = false,
  orientation = "stack",
  className,
}: CalendarDayColumnHeaderProps) {
  return (
    <div
      className={cn(
        CALENDAR_GRID.column,
        orientation === "row"
          ? CALENDAR_GRID.dayHeaderCellRow
          : CALENDAR_GRID.dayHeaderCell,
        className,
      )}
    >
      <span className={CALENDAR_GRID.dayHeaderWeekday}>{weekday}</span>
      <span
        className={cn(
          CALENDAR_GRID.dayHeaderDate,
          isToday && CALENDAR_GRID.dayHeaderDateToday,
        )}
      >
        {dayNumber}
      </span>
    </div>
  );
}
