"use client";

import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";
import { CONTROL_HEIGHT_CLASS } from "@/lib/ui/control-styles";
import type { CalendarViewMode } from "@/features/calendars/utils/calendar-dates";

const PRIMARY_VIEWS: { value: CalendarViewMode; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
];

const SECONDARY_VIEWS: { value: CalendarViewMode; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "list", label: "List" },
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
  const isSecondary = value === "month" || value === "list";

  return (
    <div className={cn("flex shrink-0 items-center gap-1", className)}>
      <div
        className="flex shrink-0 items-center gap-0.5 rounded-[var(--radius-control)] border border-border/70 bg-muted/20 p-0.5"
        role="group"
        aria-label="Calendar view"
      >
        {PRIMARY_VIEWS.map((view) => (
          <button
            key={view.value}
            type="button"
            aria-current={value === view.value ? "page" : undefined}
            aria-label={`${view.label} view`}
            onClick={() => onChange(view.value)}
            className={cn(
              CONTROL_HEIGHT_CLASS,
              "inline-flex min-w-[3.25rem] items-center justify-center rounded-[calc(var(--radius-control)-2px)] px-3 text-xs font-semibold transition-colors",
              value === view.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
            )}
          >
            {view.label}
          </button>
        ))}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <IconButton
              aria-label="More calendar views"
              className={cn(
                isSecondary && "border-primary/40 bg-primary/5 text-primary",
              )}
            >
              <MoreHorizontal className="size-4" />
            </IconButton>
          }
        />
        <DropdownMenuContent align="end">
          {SECONDARY_VIEWS.map((view) => (
            <DropdownMenuItem
              key={view.value}
              onClick={() => onChange(view.value)}
            >
              {view.label}
              {value === view.value ? " ✓" : ""}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
