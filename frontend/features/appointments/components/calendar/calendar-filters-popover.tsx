"use client";

import { useState } from "react";
import { ListFilterButton } from "@/components/layout/list-filter-button";
import { OptionsFilterDrawer } from "@/components/layout/options-filter-drawer";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { AppointmentStatus } from "@/features/appointments/schemas/appointment-profile";
import { APPOINTMENT_LIFECYCLE_STATUS_OPTIONS } from "@/features/appointments/schemas/appointment-profile";
import { getAppointmentStatusDotClass } from "@/features/appointments/utils/appointment-calendar-styles";
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
 * Calendar status filters — shared ListFilterButton + OptionsFilterDrawer.
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
      <ListFilterButton
        aria-label={
          activeCount > 0 ? `Filters, ${activeCount} active` : "Filters"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        count={activeCount}
        className={triggerClassName}
        iconClassName={iconClassName}
        onClick={() => handleOpenChange(true)}
      />

      <OptionsFilterDrawer
        open={open}
        onOpenChange={handleOpenChange}
        title="Filters"
        spineLabel="FILTERS"
        applyLabel="Apply"
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
