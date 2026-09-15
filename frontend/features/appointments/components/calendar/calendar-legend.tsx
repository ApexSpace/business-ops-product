"use client";

import type { Calendar } from "@/features/calendars/schemas/calendar-profile";
import { cn } from "@/lib/utils";

interface CalendarLegendProps {
  calendars: Calendar[];
  className?: string;
}

export function CalendarLegend({ calendars, className }: CalendarLegendProps) {
  const visibleCalendars = calendars.length > 0 ? calendars : [];

  if (visibleCalendars.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 pt-3",
        className,
      )}
      aria-label="Calendar legend"
    >
      {visibleCalendars.map((calendar) => (
        <div
          key={calendar.id}
          className="inline-flex min-w-0 items-center gap-2 text-xs text-muted-foreground"
        >
          <span
            className="size-2.5 shrink-0 rounded-full bg-primary"
            style={
              calendar.color ? { backgroundColor: calendar.color } : undefined
            }
            aria-hidden
          />
          <span className="truncate">{calendar.name}</span>
        </div>
      ))}
    </div>
  );
}
