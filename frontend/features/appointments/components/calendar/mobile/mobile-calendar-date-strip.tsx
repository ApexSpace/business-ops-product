"use client";

import { useEffect, useMemo, useState } from "react";
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

/** Visible day cells in the mobile strip (day + week views). */
export const MOBILE_CAL_STRIP_VISIBLE_DAYS = 5;

interface MobileCalendarDateStripProps {
  anchorDateKey: string;
  timezone: string;
  view: CalendarViewMode;
  onDateSelect: (dateKey: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
}

export function buildStripDateKeysFromStart(
  stripStartDateKey: string,
  timezone: string,
  dayCount = MOBILE_CAL_STRIP_VISIBLE_DAYS,
): string[] {
  const start = parseDateKeyInTimezone(stripStartDateKey, timezone);
  return Array.from({ length: dayCount }, (_, i) =>
    start.plus({ days: i }).toFormat("yyyy-MM-dd"),
  );
}

/** First-load window only — selected day starts centered; not used on every tap. */
export function initialMobileStripStartKey(
  anchorDateKey: string,
  timezone: string,
  dayCount = MOBILE_CAL_STRIP_VISIBLE_DAYS,
): string {
  const anchor = parseDateKeyInTimezone(anchorDateKey, timezone);
  const centerOffset = Math.floor((dayCount - 1) / 2);
  return anchor.minus({ days: centerOffset }).toFormat("yyyy-MM-dd");
}

/**
 * When the selected date jumps outside the strip (month picker, deep link),
 * slide the window just enough to include it — never re-center on the anchor.
 */
export function resolveStripStartKeyForAnchor(
  currentStartDateKey: string,
  anchorDateKey: string,
  timezone: string,
  dayCount = MOBILE_CAL_STRIP_VISIBLE_DAYS,
): string {
  const keys = buildStripDateKeysFromStart(
    currentStartDateKey,
    timezone,
    dayCount,
  );
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (anchorDateKey >= first && anchorDateKey <= last) {
    return currentStartDateKey;
  }
  if (anchorDateKey < first) {
    return anchorDateKey;
  }
  const anchor = parseDateKeyInTimezone(anchorDateKey, timezone);
  return anchor.minus({ days: dayCount - 1 }).toFormat("yyyy-MM-dd");
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
  const [stripStartKey, setStripStartKey] = useState(() =>
    initialMobileStripStartKey(anchorDateKey, timezone),
  );

  useEffect(() => {
    setStripStartKey((current) =>
      resolveStripStartKeyForAnchor(current, anchorDateKey, timezone),
    );
  }, [anchorDateKey, timezone]);

  const stripKeys = useMemo(
    () => buildStripDateKeysFromStart(stripStartKey, timezone),
    [stripStartKey, timezone],
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
        onClick={() => {
          setStripStartKey((current) =>
            shiftMobileStripDateKey(current, timezone, -1),
          );
          onPrevious();
        }}
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
        onClick={() => {
          setStripStartKey((current) =>
            shiftMobileStripDateKey(current, timezone, 1),
          );
          onNext();
        }}
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
