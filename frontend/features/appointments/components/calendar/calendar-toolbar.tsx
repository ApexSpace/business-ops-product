"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { CalendarDatePicker } from "@/features/appointments/components/calendar/calendar-date-picker";
import { CalendarViewSwitcher } from "@/features/appointments/components/calendar/calendar-view-switcher";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import type { CalendarViewMode } from "@/features/calendars/utils/calendar-dates";
import { formatDateRangeLabelInTimezone } from "@/features/calendars/utils/timezone";
import { CONTROL_HEIGHT_CLASS } from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";

interface CalendarToolbarProps {
  view: CalendarViewMode;
  onViewChange: (view: CalendarViewMode) => void;
  anchorDateKey: string;
  timezone: string;
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
  onDateSelect: (dateKey: string) => void;
  onNewAppointment: () => void;
  filters?: React.ReactNode;
  className?: string;
}

/** View used for date-range label and prev/next (list uses week). */
function navigationView(view: CalendarViewMode): "day" | "week" | "month" {
  if (view === "day") return "day";
  if (view === "month") return "month";
  return "week";
}

export function CalendarToolbar({
  view,
  onViewChange,
  anchorDateKey,
  timezone,
  onPrevious,
  onToday,
  onNext,
  onDateSelect,
  onNewAppointment,
  filters,
  className,
}: CalendarToolbarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const navView = navigationView(view);
  const rangeLabel = formatDateRangeLabelInTimezone(
    anchorDateKey,
    navView,
    timezone,
  );

  return (
    <div
      className={cn(
        "flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-0.5",
        className,
      )}
    >
      <Button
        type="button"
        variant="outline"
        className={cn(CONTROL_HEIGHT_CLASS, "shrink-0 px-3")}
        onClick={onToday}
      >
        Today
      </Button>

      <div
        className="inline-flex shrink-0 items-stretch overflow-hidden rounded-md border border-border bg-background"
        role="group"
        aria-label="Navigate calendar dates"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
            className={cn(
              CONTROL_HEIGHT_CLASS,
              "w-[var(--control-height)] shrink-0 rounded-none border-0 px-0 shadow-none hover:bg-muted/80",
            )}
            onClick={onPrevious}
          aria-label="Previous"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <CalendarDatePicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          anchorDateKey={anchorDateKey}
          timezone={timezone}
          view={view}
          onSelectDate={onDateSelect}
          onToday={onToday}
          trigger={
            <button
              type="button"
              className={cn(
                "flex min-w-[9.5rem] max-w-[14rem] cursor-pointer items-center justify-center gap-1 border-x border-border px-2 py-1.5 text-sm font-medium transition-colors",
                "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                "sm:min-w-[11rem] sm:max-w-[18rem]",
              )}
              aria-label={`${rangeLabel}. Open date picker`}
              aria-expanded={pickerOpen}
            >
              <span className="truncate">{rangeLabel}</span>
              <ChevronDown
                className={cn(
                  "size-3.5 shrink-0 text-muted-foreground transition-transform",
                  pickerOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>
          }
        />

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
            className={cn(
              CONTROL_HEIGHT_CLASS,
              "w-[var(--control-height)] shrink-0 rounded-none border-0 px-0 shadow-none hover:bg-muted/80",
            )}
            onClick={onNext}
          aria-label="Next"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {filters ? (
        <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2">
          {filters}
        </div>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <CalendarViewSwitcher value={view} onChange={onViewChange} />
        <ActionButton className="shrink-0" onClick={onNewAppointment}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Create appointment</span>
          <span className="sm:hidden">Create</span>
        </ActionButton>
      </div>
    </div>
  );
}
