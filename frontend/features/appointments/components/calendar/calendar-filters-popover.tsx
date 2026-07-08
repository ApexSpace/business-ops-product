"use client";

import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { AppointmentStatus } from "@/features/appointments/schemas/appointment-profile";
import { APPOINTMENT_STATUS_OPTIONS } from "@/features/appointments/schemas/appointment-profile";
import { getAppointmentStatusDotClass } from "@/features/appointments/utils/appointment-calendar-styles";
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
          <Button type="button" variant="outline" className="h-9 gap-2">
            <Filter className="size-4" />
            Filters
            {activeCount > 0 ? (
              <span className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
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
            {APPOINTMENT_STATUS_OPTIONS.map((opt) => {
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
