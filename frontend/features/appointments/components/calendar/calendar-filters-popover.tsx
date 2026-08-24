"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { OptionsFilterDrawer } from "@/components/layout/options-filter-drawer";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { AppointmentStatus } from "@/features/appointments/schemas/appointment-profile";
import { APPOINTMENT_LIFECYCLE_STATUS_OPTIONS } from "@/features/appointments/schemas/appointment-profile";
import { getAppointmentStatusDotClass } from "@/features/appointments/utils/appointment-calendar-styles";
import { CALENDAR_TOOLBAR_FILTER_BUTTON_CLASS } from "@/features/appointments/components/calendar/calendar-toolbar-tokens";
import {
  DRAWER_CHECKBOX_CLASS,
  DRAWER_CHECKBOX_LABEL_CLASS,
  DRAWER_FORM_FIELDS_CLASS,
} from "@/lib/design/drawer-tokens";
import { cn } from "@/lib/utils";

interface CalendarFiltersPopoverProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  /** Override trigger button classes (e.g. purple mobile header). */
  triggerClassName?: string;
  iconClassName?: string;
}

function parseStatuses(value: string): AppointmentStatus[] {
  return value
    ? (value.split(",").filter(Boolean) as AppointmentStatus[])
    : [];
}

function serializeStatuses(statuses: AppointmentStatus[]): string {
  return statuses.join(",");
}

/**
 * Calendar status filters — same sliders trigger as before, but the panel is
 * the shared OptionsFilterDrawer (right sidebar), not a popover.
 */
export function CalendarFiltersPopover({
  statusFilter,
  onStatusFilterChange,
  triggerClassName,
  iconClassName,
}: CalendarFiltersPopoverProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AppointmentStatus[]>(() =>
    parseStatuses(statusFilter),
  );

  const applied = parseStatuses(statusFilter);
  const activeCount = applied.length;

  const handleOpenChange = (next: boolean) => {
    if (next) setDraft(parseStatuses(statusFilter));
    setOpen(next);
  };

  const toggleStatus = (status: AppointmentStatus, checked: boolean) => {
    setDraft((prev) => {
      const set = new Set(prev);
      if (checked) set.add(status);
      else set.delete(status);
      return Array.from(set);
    });
  };

  return (
    <>
      <button
        type="button"
        aria-label={
          activeCount > 0 ? `Filters, ${activeCount} active` : "Filters"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          CALENDAR_TOOLBAR_FILTER_BUTTON_CLASS,
          "relative",
          triggerClassName,
        )}
        onClick={() => handleOpenChange(true)}
      >
        <SlidersHorizontal
          className={cn("size-5 shrink-0 text-black", iconClassName)}
          strokeWidth={2}
        />
        {activeCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 inline-flex size-5 items-center justify-center rounded-full bg-violet-primary-normal text-[11px] font-semibold text-white">
            {activeCount}
          </span>
        ) : null}
      </button>

      <OptionsFilterDrawer
        open={open}
        onOpenChange={handleOpenChange}
        title="Filters"
        spineLabel="FILTERS"
        applyLabel="Apply"
        showMoreAction={false}
        onApply={() => onStatusFilterChange(serializeStatuses(draft))}
      >
        <div className={DRAWER_FORM_FIELDS_CLASS}>
          <fieldset className="flex w-full min-w-0 flex-col gap-1 border-0 p-0">
            <legend className="mb-2 text-[12px] font-medium leading-none text-[var(--drawer-text-secondary)]">
              Status
            </legend>
            {APPOINTMENT_LIFECYCLE_STATUS_OPTIONS.map((opt) => {
              const checked = draft.includes(opt.value);
              const id = `appointment-filter-status-${opt.value}`;
              return (
                <div
                  key={opt.value}
                  className="flex min-h-11 w-full min-w-0 items-center gap-3"
                >
                  <Checkbox
                    id={id}
                    checked={checked}
                    className={DRAWER_CHECKBOX_CLASS}
                    onCheckedChange={(value) =>
                      toggleStatus(opt.value, value === true)
                    }
                  />
                  <span
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      getAppointmentStatusDotClass(opt.value),
                    )}
                    aria-hidden
                  />
                  <Label
                    htmlFor={id}
                    className={cn(DRAWER_CHECKBOX_LABEL_CLASS, "cursor-pointer")}
                  >
                    {opt.label}
                  </Label>
                </div>
              );
            })}
          </fieldset>
        </div>
      </OptionsFilterDrawer>
    </>
  );
}
