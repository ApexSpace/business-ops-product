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
      {VIEWS.map((view, index) => (
        <button
          key={view.value}
          type="button"
          aria-current={value === view.value ? "page" : undefined}
          aria-label={`${view.label} view`}
          onClick={() => onChange(view.value)}
          className={cn(
            CALENDAR_TOOLBAR_SEGMENT_BUTTON_CLASS,
            index > 0 && "border-l border-border",
            value === view.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-white text-muted-foreground hover:bg-muted/50 hover:text-foreground dark:bg-card dark:hover:bg-muted/40",
          )}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
