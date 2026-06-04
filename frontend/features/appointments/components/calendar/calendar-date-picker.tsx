"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { CalendarViewMode } from "@/features/calendars/utils/calendar-dates";
import { isTodayDateKey, parseDateKeyInTimezone } from "@/features/calendars/utils/timezone";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface CalendarDatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorDateKey: string;
  timezone: string;
  view: CalendarViewMode;
  onSelectDate: (dateKey: string) => void;
  onToday: () => void;
  trigger: React.ReactElement;
}

export function CalendarDatePicker({
  open,
  onOpenChange,
  anchorDateKey,
  timezone,
  view,
  onSelectDate,
  onToday,
  trigger,
}: CalendarDatePickerProps) {
  const [visibleMonthKey, setVisibleMonthKey] = useState(anchorDateKey);

  useEffect(() => {
    if (open) {
      setVisibleMonthKey(anchorDateKey);
    }
  }, [open, anchorDateKey]);

  const monthDt = parseDateKeyInTimezone(visibleMonthKey, timezone).startOf(
    "month",
  );
  const monthLabel = monthDt.toFormat("MMMM yyyy");

  const gridDays = useMemo(() => {
    const monthStart = monthDt;
    const monthEnd = monthDt.endOf("month");
    const daysFromSunday =
      monthStart.weekday === 7 ? 0 : monthStart.weekday;
    const gridStart = monthStart.minus({ days: daysFromSunday });
    const trailing =
      monthEnd.weekday === 7 ? 6 : 6 - monthEnd.weekday;
    const gridEnd = monthEnd.plus({ days: trailing });
    const days: string[] = [];
    let cursor = gridStart;
    while (cursor <= gridEnd) {
      days.push(cursor.toFormat("yyyy-MM-dd"));
      cursor = cursor.plus({ days: 1 });
    }
    return days;
  }, [monthDt]);

  const handleSelect = (dateKey: string) => {
    onSelectDate(dateKey);
    onOpenChange(false);
  };

  const handleToday = () => {
    onToday();
    onOpenChange(false);
  };

  const pickerTitle =
    view === "month"
      ? "Go to month"
      : view === "week" || view === "list"
        ? "Go to week"
        : "Go to date";

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="center" className="w-auto p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          {pickerTitle}
        </p>
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Previous month"
            onClick={() =>
              setVisibleMonthKey(
                monthDt.minus({ months: 1 }).toFormat("yyyy-MM-dd"),
              )
            }
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[8rem] text-center text-sm font-medium">
            {monthLabel}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Next month"
            onClick={() =>
              setVisibleMonthKey(
                monthDt.plus({ months: 1 }).toFormat("yyyy-MM-dd"),
              )
            }
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="mt-2 grid grid-cols-7 gap-0.5">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="flex size-8 items-center justify-center text-[10px] font-medium text-muted-foreground"
            >
              {label}
            </div>
          ))}
          {gridDays.map((dateKey) => {
            const dt = parseDateKeyInTimezone(dateKey, timezone);
            const inMonth = dt.month === monthDt.month;
            const isSelected = dateKey === anchorDateKey;
            const isToday = isTodayDateKey(dateKey, timezone);

            return (
              <button
                key={dateKey}
                type="button"
                className={cn(
                  "flex size-8 items-center justify-center rounded-md text-sm transition-colors",
                  "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !inMonth && "text-muted-foreground/50",
                  inMonth && "text-foreground",
                  isSelected &&
                    "bg-primary font-medium text-primary-foreground hover:bg-primary/90",
                  isToday &&
                    !isSelected &&
                    "font-semibold text-primary underline-offset-2",
                )}
                onClick={() => handleSelect(dateKey)}
              >
                {dt.day}
              </button>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={handleToday}
        >
          Today
        </Button>
      </PopoverContent>
    </Popover>
  );
}
