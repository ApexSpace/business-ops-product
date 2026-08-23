"use client";

import { useMemo } from "react";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
import type { CalendarViewMode } from "@/features/calendars/utils/calendar-dates";
import {
  formatShortWeekdayForDateKey,
  navigateDateKeyInTimezone,
  parseDateKeyInTimezone,
} from "@/features/calendars/utils/timezone";
import {
  MOBILE_CAL_DATE_SELECTED_BG,
  MOBILE_CAL_WEEK_VISIBLE_DAYS,
} from "@/features/appointments/styles/mobile-calendar-tokens";
import { cn } from "@/lib/utils";

interface MobileCalendarDateStripProps {
  anchorDateKey: string;
  timezone: string;
  view: CalendarViewMode;
  onDateSelect: (dateKey: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
}

function buildStripDateKeys(
  anchorDateKey: string,
  timezone: string,
): string[] {
  const anchor = parseDateKeyInTimezone(anchorDateKey, timezone);
  // Figma: five day cells centered on the selected day
  const start = anchor.minus({ days: 2 });
  return Array.from({ length: 5 }, (_, i) =>
    start.plus({ days: i }).toFormat("yyyy-MM-dd"),
  );
}

function weekRangeKeys(anchorDateKey: string, timezone: string): Set<string> {
  const anchor = parseDateKeyInTimezone(anchorDateKey, timezone);
  // Sunday-start week → Mon–Wed = indexes 1..3 (Figma mobile week)
  const sundayOffset = anchor.weekday === 7 ? 0 : anchor.weekday;
  const weekStart = anchor.minus({ days: sundayOffset });
  const keys = new Set<string>();
  for (let i = 1; i <= MOBILE_CAL_WEEK_VISIBLE_DAYS; i += 1) {
    keys.add(weekStart.plus({ days: i }).toFormat("yyyy-MM-dd"));
  }
  return keys;
}

export function MobileCalendarDateStrip({
  anchorDateKey,
  timezone,
  view,
  onDateSelect,
  onPrevious,
  onNext,
  className,
}: MobileCalendarDateStripProps) {
  const stripKeys = useMemo(
    () => buildStripDateKeys(anchorDateKey, timezone),
    [anchorDateKey, timezone],
  );
  const weekSelected = useMemo(
    () =>
      view === "week" ? weekRangeKeys(anchorDateKey, timezone) : null,
    [anchorDateKey, timezone, view],
  );

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-1 border-b border-[#EDE9E3] bg-white px-2 py-2",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Previous"
        onClick={onPrevious}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-[#D6D0C8] bg-white text-[#5A5A5A] hover:bg-[#F7F4F0]"
      >
        <NavArrowIcon direction="left" size="lg" />
      </button>

      <div className="flex min-w-0 flex-1 items-stretch justify-between gap-1">
        {stripKeys.map((dateKey) => {
          const weekday = formatShortWeekdayForDateKey(dateKey, timezone);
          const dayNum = parseDateKeyInTimezone(dateKey, timezone).toFormat(
            "d",
          );
          const isDaySelected =
            view !== "week" && dateKey === anchorDateKey;
          const isInWeekRange = weekSelected?.has(dateKey) ?? false;
          const selected = isDaySelected || isInWeekRange;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onDateSelect(dateKey)}
              aria-pressed={selected}
              className={cn(
                "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-center transition-colors",
                selected
                  ? cn(MOBILE_CAL_DATE_SELECTED_BG, "text-white")
                  : "bg-transparent text-[#1A1A1A] hover:bg-[#F6F1FE]",
              )}
            >
              <span
                className={cn(
                  "text-[11px] font-medium leading-none",
                  selected ? "text-white/90" : "text-[#8A8A8A]",
                )}
              >
                {weekday}
              </span>
              <span className="text-[15px] font-semibold leading-none">
                {dayNum}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="Next"
        onClick={onNext}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-[#D6D0C8] bg-white text-[#5A5A5A] hover:bg-[#F7F4F0]"
      >
        <NavArrowIcon direction="right" size="lg" />
      </button>
    </div>
  );
}

/** Shift strip window by one day without changing calendar navigate semantics helpers. */
export function shiftMobileStripDateKey(
  dateKey: string,
  timezone: string,
  direction: -1 | 1,
): string {
  return navigateDateKeyInTimezone(dateKey, timezone, "day", direction);
}
