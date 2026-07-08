"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarDatePicker } from "@/features/appointments/components/calendar/calendar-date-picker";
import { CalendarViewSwitcher } from "@/features/appointments/components/calendar/calendar-view-switcher";
import { CalendarFiltersPopover } from "@/features/appointments/components/calendar/calendar-filters-popover";
import {
  StaffSelector,
  type StaffMemberOption,
} from "@/features/appointments/components/calendar/staff-selector";
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
  onJumpWeeks?: (weeks: number) => void;
  staffMembers: StaffMemberOption[];
  selectedStaffId?: string;
  onSelectedStaffIdChange?: (userId: string) => void;
  visibleStaffIds?: string[];
  onVisibleStaffIdsChange?: (ids: string[]) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  className?: string;
}

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
  onJumpWeeks,
  staffMembers,
  selectedStaffId,
  onSelectedStaffIdChange,
  visibleStaffIds,
  onVisibleStaffIdsChange,
  statusFilter,
  onStatusFilterChange,
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
      className={cn("min-w-0 overflow-x-auto scrollbar-thin", className)}
    >
      <div className="flex w-max min-w-full flex-nowrap items-center gap-2 pb-0.5">
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
            onJumpWeeks={onJumpWeeks}
            trigger={
              <button
                type="button"
                className={cn(
                  "flex w-[10.5rem] shrink-0 cursor-pointer items-center justify-center gap-1 border-x border-border px-2 py-1.5 text-sm font-medium transition-colors",
                  "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  "sm:w-[12rem]",
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

        {view === "week" && staffMembers.length > 0 ? (
          <StaffSelector
            mode="single"
            members={staffMembers}
            selectedStaffId={selectedStaffId}
            onSelectedStaffIdChange={onSelectedStaffIdChange}
          />
        ) : null}

        {view === "day" && staffMembers.length > 0 ? (
          <StaffSelector
            mode="multi"
            members={staffMembers}
            visibleStaffIds={visibleStaffIds}
            onVisibleStaffIdsChange={onVisibleStaffIdsChange}
          />
        ) : null}

        <CalendarFiltersPopover
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange}
        />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <CalendarViewSwitcher value={view} onChange={onViewChange} />
        </div>
      </div>
    </div>
  );
}
