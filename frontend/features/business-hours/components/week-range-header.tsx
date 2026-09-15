"use client";

import {
  BUSINESS_HOURS_NAV_BUTTON_CLASS,
  BUSINESS_HOURS_NAV_GROUP_CLASS,
  BUSINESS_HOURS_RANGE_LABEL_CLASS,
} from "@/features/business-hours/utils/business-hours-tokens";
import { formatDateKey, getWeekRange } from "@/features/calendars/utils/calendar-dates";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
import { cn } from "@/lib/utils";

interface WeekRangeHeaderProps {
  anchorDate: Date;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
}

function formatWeekRangeLabel(anchorDate: Date): string {
  const { start, end } = getWeekRange(anchorDate);
  const sameYear = start.getFullYear() === end.getFullYear();
  const startStr = start.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const endStr = end.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `${startStr}–${endStr}`;
}

export function WeekRangeHeader({
  anchorDate,
  onPrevious,
  onNext,
  className,
}: WeekRangeHeaderProps) {
  const label = formatWeekRangeLabel(anchorDate);

  return (
    <div
      className={cn(BUSINESS_HOURS_NAV_GROUP_CLASS, className)}
      role="group"
      aria-label="Navigate weeks"
    >
      <button
        type="button"
        className={BUSINESS_HOURS_NAV_BUTTON_CLASS}
        onClick={onPrevious}
        aria-label="Previous week"
      >
        <NavArrowIcon direction="left" size="sm" />
      </button>
      <span
        className={BUSINESS_HOURS_RANGE_LABEL_CLASS}
        aria-live="polite"
        title={label}
      >
        {label}
      </span>
      <button
        type="button"
        className={BUSINESS_HOURS_NAV_BUTTON_CLASS}
        onClick={onNext}
        aria-label="Next week"
      >
        <NavArrowIcon direction="right" size="sm" />
      </button>
    </div>
  );
}

export function isTodayDate(date: Date): boolean {
  return formatDateKey(date) === formatDateKey(new Date());
}
