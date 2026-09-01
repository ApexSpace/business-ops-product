"use client";

import { useState } from "react";
import { CalendarDatePicker } from "@/features/appointments/components/calendar/calendar-date-picker";
import { CalendarViewSwitcher } from "@/features/appointments/components/calendar/calendar-view-switcher";
import { CalendarFiltersPopover } from "@/features/appointments/components/calendar/calendar-filters-popover";
import {
  StaffSelector,
  type StaffMemberOption,
} from "@/features/appointments/components/calendar/staff-selector";
import {
  CALENDAR_TOOLBAR_DATE_TRIGGER_CLASS,
  CALENDAR_TOOLBAR_NAV_BUTTON_CLASS,
  CALENDAR_TOOLBAR_NAV_GROUP_CLASS,
  CALENDAR_TOOLBAR_TODAY_BUTTON_CLASS,
} from "@/features/appointments/components/calendar/calendar-toolbar-tokens";
import type { CalendarViewMode } from "@/features/calendars/utils/calendar-dates";
import { formatDateRangeLabelInTimezone } from "@/features/calendars/utils/timezone";
import { Button } from "@/components/ui/button";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
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
  weekJumpOptions?: number[];
  staffMembers: StaffMemberOption[];
  selectedStaffId?: string;
  onSelectedStaffIdChange?: (userId: string) => void;
  showStaffSelector?: boolean;
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
  weekJumpOptions,
  staffMembers,
  selectedStaffId,
  onSelectedStaffIdChange,
  showStaffSelector: showStaffSelectorProp,
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
  // Figma: staff picker only in Week (Day shows every staff as columns)
  const showStaffSelector =
    showStaffSelectorProp !== false &&
    view === "week" &&
    staffMembers.length > 0;

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-wrap items-center justify-between gap-3 sm:gap-4",
        className,
      )}
    >
      {/* Prev / Today / Next — shared --control-height, then date frame */}
      <div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-[25px]">
        <div
          className={CALENDAR_TOOLBAR_NAV_GROUP_CLASS}
          role="group"
          aria-label="Navigate calendar dates"
        >
          <button
            type="button"
            className={CALENDAR_TOOLBAR_NAV_BUTTON_CLASS}
            onClick={onPrevious}
            aria-label="Previous"
          >
            <NavArrowIcon direction="left" size="lg" />
          </button>
          <Button
            type="button"
            variant="brand"
            className={CALENDAR_TOOLBAR_TODAY_BUTTON_CLASS}
            onClick={onToday}
          >
            Today
          </Button>
          <button
            type="button"
            className={CALENDAR_TOOLBAR_NAV_BUTTON_CLASS}
            onClick={onNext}
            aria-label="Next"
          >
            <NavArrowIcon direction="right" size="lg" />
          </button>
        </div>

        <CalendarDatePicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          anchorDateKey={anchorDateKey}
          timezone={timezone}
          view={view}
          onSelectDate={onDateSelect}
          onToday={onToday}
          onJumpWeeks={onJumpWeeks}
          weekJumpOptions={weekJumpOptions}
          trigger={
            <button
              type="button"
              className={cn(
                CALENDAR_TOOLBAR_DATE_TRIGGER_CLASS,
                "max-w-[min(100%,280px)] sm:max-w-none",
              )}
              aria-label={`${rangeLabel}. Open date picker`}
              aria-expanded={pickerOpen}
            >
              <span className="min-w-0 truncate leading-5">
                {rangeLabel}
              </span>
              <NavArrowIcon
                direction={pickerOpen ? "up" : "down"}
                size="sm"
                className="shrink-0 text-violet-primary-normal"
              />
            </button>
          }
        />
      </div>

      {/* Figma right cluster — staff (week only) + filter + Day/Week · gap 21px */}
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-3 sm:gap-[21px]">
        {showStaffSelector ? (
          <StaffSelector
            mode="single"
            members={staffMembers}
            selectedStaffId={selectedStaffId}
            onSelectedStaffIdChange={onSelectedStaffIdChange}
          />
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
