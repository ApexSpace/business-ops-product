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
import {
  CALENDAR_TOOLBAR_DATE_GROUP_CLASS,
  CALENDAR_TOOLBAR_DATE_ICON_BUTTON_CLASS,
  CALENDAR_TOOLBAR_DATE_LABEL_CLASS,
  CALENDAR_TOOLBAR_DIVIDER_CLASS,
  CALENDAR_TOOLBAR_OUTLINE_BUTTON_CLASS,
} from "@/features/appointments/components/calendar/calendar-toolbar-tokens";
import { Button } from "@/components/ui/button";
import type { CalendarViewMode } from "@/features/calendars/utils/calendar-dates";
import { formatDateRangeLabelInTimezone } from "@/features/calendars/utils/timezone";
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
  const showStaffSelector =
    (view === "week" || view === "day") && staffMembers.length > 0;

  return (
    <div
      className={cn(
        "flex w-full min-w-0 items-center justify-between gap-3",
        className,
      )}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
        <Button
          type="button"
          variant="outline"
          className={CALENDAR_TOOLBAR_OUTLINE_BUTTON_CLASS}
          onClick={onToday}
        >
          Today
        </Button>

        <div
          className={cn(
            CALENDAR_TOOLBAR_DATE_GROUP_CLASS,
            "sm:min-w-[13rem] lg:min-w-[15rem]",
          )}
          role="group"
          aria-label="Navigate calendar dates"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={CALENDAR_TOOLBAR_DATE_ICON_BUTTON_CLASS}
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
                  CALENDAR_TOOLBAR_DATE_LABEL_CLASS,
                  "min-w-[7.5rem] sm:min-w-[9rem]",
                )}
                aria-label={`${rangeLabel}. Open date picker`}
                aria-expanded={pickerOpen}
              >
                <span className="min-w-0 truncate">{rangeLabel}</span>
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
            className={CALENDAR_TOOLBAR_DATE_ICON_BUTTON_CLASS}
            onClick={onNext}
            aria-label="Next"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        {showStaffSelector ? (
          <>
            <div className={CALENDAR_TOOLBAR_DIVIDER_CLASS} aria-hidden />
            {view === "week" ? (
              <StaffSelector
                mode="single"
                members={staffMembers}
                selectedStaffId={selectedStaffId}
                onSelectedStaffIdChange={onSelectedStaffIdChange}
              />
            ) : (
              <StaffSelector
                mode="multi"
                members={staffMembers}
                visibleStaffIds={visibleStaffIds}
                onVisibleStaffIdsChange={onVisibleStaffIdsChange}
              />
            )}
          </>
        ) : null}

        <CalendarFiltersPopover
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange}
        />

        <CalendarViewSwitcher value={view} onChange={onViewChange} />
      </div>
    </div>
  );
}
