"use client";

import { cn } from "@/lib/utils";
import type { CalendarViewMode } from "@/features/calendars/utils/calendar-dates";
import {
  CALENDAR_TOOLBAR_SEGMENT_BUTTON_CLASS,
  CALENDAR_TOOLBAR_SEGMENT_GROUP_CLASS,
} from "@/features/appointments/components/calendar/calendar-toolbar-tokens";

const VIEWS: { value: CalendarViewMode; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
];

interface CalendarViewSwitcherProps {
  value: CalendarViewMode;
  onChange: (view: CalendarViewMode) => void;
  className?: string;
}

export function CalendarViewSwitcher({
  value,
  onChange,
  className,
}: CalendarViewSwitcherProps) {
  return (
    <div
      className={cn(CALENDAR_TOOLBAR_SEGMENT_GROUP_CLASS, className)}
      role="group"
      aria-label="Calendar view"
    >
      {VIEWS.map((view) => {
        const active = value === view.value;
        return (
          <button
            key={view.value}
            type="button"
            aria-current={active ? "page" : undefined}
            aria-label={`${view.label} view`}
            onClick={() => onChange(view.value)}
            className={cn(
              CALENDAR_TOOLBAR_SEGMENT_BUTTON_CLASS,
              active
                ? "bg-[#7E3BED] text-white"
                : "bg-white text-[#7E3BED] hover:bg-[#F6F1FE]",
            )}
          >
            {view.label}
          </button>
        );
      })}
    </div>
  );
}
