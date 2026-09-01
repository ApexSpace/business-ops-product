"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
import { CalendarDatePicker } from "@/features/appointments/components/calendar/calendar-date-picker";
import { CalendarFiltersPopover } from "@/features/appointments/components/calendar/calendar-filters-popover";
import type { CalendarViewMode } from "@/features/calendars/utils/calendar-dates";
import { parseDateKeyInTimezone } from "@/features/calendars/utils/timezone";
import {
  MOBILE_PAGE_TITLE_CLASS,
  MOBILE_TOP_BAR_CLASS,
  MOBILE_TOP_BAR_HEADER_ROW_CLASS,
} from "@/lib/design/mobile-list-tokens";
import { cn } from "@/lib/utils";

interface MobileCalendarHeaderProps {
  anchorDateKey: string;
  timezone: string;
  view: CalendarViewMode;
  onDateSelect: (dateKey: string) => void;
  onToday: () => void;
  onJumpWeeks?: (weeks: number) => void;
  weekJumpOptions?: number[];
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  onCreate: () => void;
  canCreate?: boolean;
  className?: string;
}

export function MobileCalendarHeader({
  anchorDateKey,
  timezone,
  view,
  onDateSelect,
  onToday,
  onJumpWeeks,
  weekJumpOptions,
  statusFilter,
  onStatusFilterChange,
  onCreate,
  canCreate = true,
  className,
}: MobileCalendarHeaderProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const headerDateLabel = parseDateKeyInTimezone(anchorDateKey, timezone).toFormat(
    "d MMMM",
  );

  return (
    <header className={cn(MOBILE_TOP_BAR_CLASS, className)}>
      <div className={MOBILE_TOP_BAR_HEADER_ROW_CLASS}>
        <div className="flex items-center justify-start">
          <CalendarFiltersPopover
            statusFilter={statusFilter}
            onStatusFilterChange={onStatusFilterChange}
            triggerClassName="!size-10 !min-h-10 !w-10 !rounded-md !border-0 !bg-transparent !shadow-none hover:!bg-white/15"
            iconClassName="!text-white"
          />
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
                MOBILE_PAGE_TITLE_CLASS,
                "inline-flex min-h-10 items-center justify-center gap-1 rounded-md px-2 hover:bg-white/10",
              )}
              aria-label={`${headerDateLabel}. Open month picker`}
              aria-expanded={pickerOpen}
            >
              {headerDateLabel}
              <NavArrowIcon direction="down" size="sm" className="opacity-90" />
            </button>
          }
        />

        <div className="flex items-center justify-end">
          <button
            type="button"
            aria-label="New appointment"
            disabled={!canCreate}
            onClick={onCreate}
            className="inline-flex size-10 items-center justify-center rounded-md text-white hover:bg-white/15 disabled:pointer-events-none disabled:opacity-40"
          >
            <Plus className="size-6" strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}
