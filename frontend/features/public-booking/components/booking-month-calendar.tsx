"use client";

import { useMemo, useState } from "react";
import { DateTime } from "luxon";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { normalizeTimezone } from "@/features/calendars/utils/timezone";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface BookingMonthCalendarProps {
  timezone: string;
  bookableDates: Set<string>;
  selectedDate: string | null;
  maxBookingDays: number;
  onSelectDate: (dateKey: string) => void;
  accentColor: string;
}

export function BookingMonthCalendar({
  timezone,
  bookableDates,
  selectedDate,
  maxBookingDays,
  onSelectDate,
  accentColor,
}: BookingMonthCalendarProps) {
  const tz = normalizeTimezone(timezone);
  const today = DateTime.now().setZone(tz).startOf("day");
  const maxDay = today.plus({ days: maxBookingDays });

  const [viewMonth, setViewMonth] = useState(() =>
    today.startOf("month"),
  );

  const monthLabel = viewMonth.toFormat("LLLL yyyy");

  const days = useMemo(() => {
    const start = viewMonth.startOf("month");
    const end = viewMonth.endOf("month");
    const gridStart = start.startOf("week");
    const gridEnd = end.endOf("week");
    const cells: Array<{
      dateKey: string;
      day: number;
      inMonth: boolean;
      disabled: boolean;
      bookable: boolean;
    }> = [];
    let cursor = gridStart;
    while (cursor <= gridEnd) {
      const dateKey = cursor.toISODate()!;
      const inMonth = cursor.month === viewMonth.month;
      const beforeToday = cursor < today;
      const afterMax = cursor > maxDay;
      const bookable = bookableDates.has(dateKey);
      cells.push({
        dateKey,
        day: cursor.day,
        inMonth,
        disabled: beforeToday || afterMax || !bookable || !inMonth,
        bookable: bookable && inMonth && !beforeToday && !afterMax,
      });
      cursor = cursor.plus({ days: 1 });
    }
    return cells;
  }, [viewMonth, today, maxDay, bookableDates]);

  const canPrev = viewMonth > today.startOf("month");
  const canNext = viewMonth.plus({ months: 1 }).startOf("month") <= maxDay.startOf("month");

  return (
    <div className="select-none">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 shrink-0"
          disabled={!canPrev}
          onClick={() => setViewMonth((m) => m.minus({ months: 1 }))}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <span className="text-base font-semibold">{monthLabel}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 shrink-0"
          disabled={!canNext}
          onClick={() => setViewMonth((m) => m.plus({ months: 1 }))}
          aria-label="Next month"
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-muted-foreground sm:gap-2">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1.5">
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d.charAt(0)}</span>
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1.5 sm:gap-2">
        {days.map((cell) => {
          const isSelected = selectedDate === cell.dateKey;
          return (
            <button
              key={cell.dateKey}
              type="button"
              disabled={cell.disabled}
              onClick={() => cell.bookable && onSelectDate(cell.dateKey)}
              aria-label={
                cell.inMonth
                  ? `${cell.day}${cell.bookable ? ", available" : ", unavailable"}`
                  : undefined
              }
              aria-pressed={isSelected}
              className={cn(
                "relative flex aspect-square min-h-[40px] max-h-[52px] w-full items-center justify-center rounded-full text-sm transition-colors sm:min-h-[44px] sm:text-base",
                !cell.inMonth && "invisible",
                cell.disabled &&
                  cell.inMonth &&
                  "cursor-not-allowed text-muted-foreground/40",
                cell.bookable &&
                  "font-medium text-foreground hover:bg-muted active:bg-muted/80",
                isSelected && "text-white hover:opacity-90",
              )}
              style={
                isSelected
                  ? { backgroundColor: accentColor }
                  : cell.bookable
                    ? undefined
                    : undefined
              }
            >
              {cell.inMonth ? cell.day : null}
              {cell.bookable && !isSelected ? (
                <span
                  className="absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full"
                  style={{ backgroundColor: accentColor }}
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
