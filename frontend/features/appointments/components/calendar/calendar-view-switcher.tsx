"use client";

import { cn } from "@/lib/utils";
import { CONTROL_HEIGHT_CLASS } from "@/lib/ui/control-styles";
import type { CalendarViewMode } from "@/features/calendars/utils/calendar-dates";

const VIEWS: { value: CalendarViewMode; label: string; shortLabel: string }[] = [
  { value: "day", label: "Day view", shortLabel: "Day" },
  { value: "week", label: "Week view", shortLabel: "Week" },
  { value: "month", label: "Month view", shortLabel: "Month" },
  { value: "list", label: "List view", shortLabel: "List" },
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
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-[var(--radius-control)] border border-border/70 bg-muted/20 p-0.5",
        className,
      )}
      role="group"
      aria-label="Calendar view"
    >
      {VIEWS.map((view) => (
        <button
          key={view.value}
          type="button"
          aria-current={value === view.value ? "page" : undefined}
          aria-label={view.label}
          onClick={() => onChange(view.value)}
          className={cn(
            CONTROL_HEIGHT_CLASS,
            "inline-flex min-w-[2.75rem] items-center justify-center rounded-[calc(var(--radius-control)-2px)] px-2.5 text-xs font-semibold transition-colors sm:min-w-[3.25rem] sm:px-3",
            value === view.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
          )}
        >
          <span className="hidden sm:inline">{view.shortLabel}</span>
          <span className="sm:hidden">{view.shortLabel.charAt(0)}</span>
        </button>
      ))}
    </div>
  );
}
