"use client";

import { useMemo, useState } from "react";
import { DateTime } from "luxon";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getMonthGridDateKeysInTimezone,
  normalizeTimezone,
  parseDateKeyInTimezone,
} from "@/features/calendars/utils/timezone";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface BookingMonthCalendarProps {
  timezone: string;
  /** Dates that currently have at least one open time slot (blue dots). */
  bookableDates: Set<string>;
  /**
   * Dates within business/staff working hours (may have zero slots).
   * When waitlist is on, these stay selectable for joining the waitlist.
   */
  openDates: Set<string>;
  selectedDate: string | null;
  maxBookingDays: number;
  waitlistEnabled?: boolean;
  onSelectDate: (dateKey: string) => void;
  accentColor: string;
}

export function BookingMonthCalendar({
  timezone,
  bookableDates,
  openDates,
  selectedDate,
  maxBookingDays,
  waitlistEnabled = false,
  onSelectDate,
  accentColor,
}: BookingMonthCalendarProps) {
  const tz = normalizeTimezone(timezone);
  const todayKey = DateTime.now().setZone(tz).toFormat("yyyy-MM-dd");
  const today = parseDateKeyInTimezone(todayKey, tz);
  const maxDay = today.plus({ days: maxBookingDays });

  const [viewMonthKey, setViewMonthKey] = useState(() =>
    today.toFormat("yyyy-MM-dd"),
  );

  const viewMonth = parseDateKeyInTimezone(viewMonthKey, tz);
  const monthLabel = viewMonth.toFormat("LLLL yyyy");

  const days = useMemo(() => {
    const gridKeys = getMonthGridDateKeysInTimezone(viewMonthKey, tz);
    return gridKeys.map((dateKey) => {
      const cursor = parseDateKeyInTimezone(dateKey, tz);
      const inMonth = cursor.month === viewMonth.month;
      const beforeToday = cursor < today;
      const afterMax = cursor > maxDay;
      const inRange = inMonth && !beforeToday && !afterMax;
      const hasSlots = bookableDates.has(dateKey);
      const isOpenDay = openDates.has(dateKey);
      // Waitlist: only working days (openDates). Never enable days outside timetable.
      const selectable =
        inRange && (hasSlots || (waitlistEnabled && isOpenDay));
      return {
        dateKey,
        day: cursor.day,
        inMonth,
        hasSlots: hasSlots && inRange,
        selectable,
        disabled: !inMonth || !selectable,
      };
    });
  }, [
    viewMonthKey,
    tz,
    viewMonth.month,
    today,
    maxDay,
    bookableDates,
    openDates,
    waitlistEnabled,
  ]);

  const canPrev = viewMonth > today.startOf("month");
  const canNext =
    viewMonth.plus({ months: 1 }).startOf("month") <=
    maxDay.startOf("month");

  return (
    <div className="select-none">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 shrink-0"
          disabled={!canPrev}
          onClick={() =>
            setViewMonthKey(
              viewMonth.minus({ months: 1 }).toFormat("yyyy-MM-dd"),
            )
          }
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
          onClick={() =>
            setViewMonthKey(
              viewMonth.plus({ months: 1 }).toFormat("yyyy-MM-dd"),
            )
          }
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

      <div className="mt-1 grid grid-cols-7 gap-1 sm:gap-1.5">
        {days.map((cell) => {
          const isSelected = selectedDate === cell.dateKey;
          return (
            <div
              key={cell.dateKey}
              className={cn(
                "flex items-center justify-center",
                !cell.inMonth && "invisible",
              )}
            >
              <button
                type="button"
                disabled={cell.disabled}
                onClick={() => cell.selectable && onSelectDate(cell.dateKey)}
                aria-label={
                  cell.inMonth
                    ? `${cell.day}${
                        cell.hasSlots
                          ? ", times available"
                          : cell.selectable
                            ? ", join waitlist"
                            : ", unavailable"
                      }`
                    : undefined
                }
                aria-pressed={isSelected}
                className={cn(
                  "group relative isolate inline-grid size-9 place-items-center border-0 bg-transparent p-0 text-sm leading-none shadow-none outline-none sm:size-10 sm:text-[15px]",
                  "appearance-none [-webkit-appearance:none]",
                  cell.disabled &&
                    cell.inMonth &&
                    "cursor-not-allowed text-muted-foreground/40",
                  cell.selectable &&
                    !isSelected &&
                    "font-medium text-foreground",
                  isSelected && "font-semibold text-white",
                )}
              >
                {isSelected ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 top-1/2 z-0 block size-7 -translate-x-1/2 -translate-y-1/2 rounded-full sm:size-8"
                    style={{ backgroundColor: accentColor }}
                  />
                ) : cell.selectable ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 top-1/2 z-0 block size-7 -translate-x-1/2 -translate-y-1/2 rounded-full group-hover:bg-muted sm:size-8"
                  />
                ) : null}
                <span className="relative z-10">
                  {cell.inMonth ? cell.day : null}
                </span>
                {cell.hasSlots && !isSelected ? (
                  <span
                    className="pointer-events-none absolute bottom-1 left-1/2 z-10 size-1 -translate-x-1/2 rounded-full"
                    style={{ backgroundColor: accentColor }}
                    aria-hidden
                  />
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
