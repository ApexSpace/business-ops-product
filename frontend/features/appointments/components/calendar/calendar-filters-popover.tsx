"use client";

import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { AppointmentStatus } from "@/features/appointments/schemas/appointment-profile";
import { APPOINTMENT_LIFECYCLE_STATUS_OPTIONS } from "@/features/appointments/schemas/appointment-profile";
import { getAppointmentStatusDotClass } from "@/features/appointments/utils/appointment-calendar-styles";
import { CALENDAR_TOOLBAR_OUTLINE_BUTTON_CLASS } from "@/features/appointments/components/calendar/calendar-toolbar-tokens";
import { cn } from "@/lib/utils";

interface CalendarFiltersPopoverProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}

export function CalendarFiltersPopover({
  statusFilter,
  onStatusFilterChange,
}: CalendarFiltersPopoverProps) {
  const selectedStatuses = statusFilter
    ? statusFilter.split(",").filter(Boolean)
    : [];

  const toggleStatus = (status: AppointmentStatus) => {
    const set = new Set(selectedStatuses);
    if (set.has(status)) set.delete(status);
    else set.add(status);
    onStatusFilterChange(Array.from(set).join(","));
  };

  const activeCount = selectedStatuses.length;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            aria-label={
              activeCount > 0
                ? `Filters, ${activeCount} active`
                : "Filters"
            }
            className={cn(
              CALENDAR_TOOLBAR_OUTLINE_BUTTON_CLASS,
              "relative",
            )}
          >
            <Filter className="size-4 shrink-0" />
            <span>Filters</span>
            {activeCount > 0 ? (
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground sm:ml-0.5">
                {activeCount}
              </span>
            ) : null}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-72 space-y-4 p-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Status
          </p>
          <div className="flex flex-col gap-1">
            {APPOINTMENT_LIFECYCLE_STATUS_OPTIONS.map((opt) => {
              const active = selectedStatuses.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                    active && "bg-muted/80",
                  )}
                  onClick={() => toggleStatus(opt.value)}
                >
                  <span
                    className={cn(
                      "size-2.5 rounded-full",
                      getAppointmentStatusDotClass(opt.value),
                    )}
                  />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
