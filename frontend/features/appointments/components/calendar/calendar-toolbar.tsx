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
  CALENDAR_TOOLBAR_DATE_TRIGGER_CLASS,
  CALENDAR_TOOLBAR_DIVIDER_CLASS,
  CALENDAR_TOOLBAR_NAV_BUTTON_CLASS,
  CALENDAR_TOOLBAR_OUTLINE_BUTTON_CLASS,
} from "@/features/appointments/components/calendar/calendar-toolbar-tokens";
import { Button } from "@/components/ui/button";
import type { CalendarViewMode } from "@/features/calendars/utils/calendar-dates";
import { formatDateRangeLabelInTimezone } from "@/features/calendars/utils/timezone";
import { cn } from "@/lib/utils";
import { WaitlistToolbarButton } from "@/features/waitlist/components/waitlist-toolbar-button";

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
  showStaffSelector?: boolean;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  onOpenWaitlist?: () => void;
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
  showStaffSelector: showStaffSelectorProp,
  statusFilter,
  onStatusFilterChange,
  onOpenWaitlist,
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
    showStaffSelectorProp !== false &&
    (view === "week" || view === "day") &&
    staffMembers.length > 0;

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-wrap items-center justify-between gap-3 sm:gap-4",
        className,
      )}
    >
      {/* Figma Frame 15 — prev/next + date · gap 11–25px · h-44 */}
      <div className="flex min-w-0 items-center gap-3 sm:gap-[25px]">
        <div
          className="flex shrink-0 items-center gap-[11px]"
          role="group"
          aria-label="Navigate calendar dates"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={CALENDAR_TOOLBAR_NAV_BUTTON_CLASS}
            onClick={onPrevious}
            aria-label="Previous"
          >
            <ChevronLeft className="size-5" strokeWidth={2} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={CALENDAR_TOOLBAR_NAV_BUTTON_CLASS}
            onClick={onNext}
            aria-label="Next"
          >
            <ChevronRight className="size-5" strokeWidth={2} />
          </Button>
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
          trigger={
            <button
              type="button"
              className={cn(
                CALENDAR_TOOLBAR_DATE_TRIGGER_CLASS,
                "max-w-[min(100%,240px)] sm:max-w-none",
              )}
              aria-label={`${rangeLabel}. Open date picker`}
              aria-expanded={pickerOpen}
            >
              <span className="min-w-0 truncate">{rangeLabel}</span>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-[#7E3BED] transition-transform",
                  pickerOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>
          }
        />
      </div>

      {/* Figma right cluster — Day/Week + Filter · gap 21px */}
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-3 sm:gap-[21px]">
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

        <CalendarViewSwitcher value={view} onChange={onViewChange} />

        <CalendarFiltersPopover
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange}
        />

        {onOpenWaitlist ? (
          <WaitlistToolbarButton
            onClick={onOpenWaitlist}
            className={CALENDAR_TOOLBAR_OUTLINE_BUTTON_CLASS}
          />
        ) : null}
      </div>
    </div>
  );
}
