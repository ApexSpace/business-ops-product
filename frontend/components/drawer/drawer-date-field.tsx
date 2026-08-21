"use client";

import { Input } from "@/components/ui/input";
import { DrawerField } from "@/components/drawer/drawer-field";
import { DrawerCalendarIcon } from "@/components/drawer/drawer-icons";
import {
  APPOINTMENT_DRAWER_BOOKING_DATETIME_CELL_CLASS,
  APPOINTMENT_DRAWER_FIELD_CLASS,
  APPOINTMENT_DRAWER_FIELD_LABEL_CLASS,
} from "@/features/appointments/styles/appointment-drawer-tokens";
import { cn } from "@/lib/utils";

function formatDateKeyShort(dateKey: string): string {
  if (!dateKey) return "Select date";
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export interface DrawerDateFieldProps {
  dateKey?: string;
  /** Pre-formatted label for read-only display */
  displayValue?: string;
  onDateChange?: (dateKey: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  onClick?: () => void;
  id?: string;
  className?: string;
}

export function DrawerDateField({
  dateKey = "",
  displayValue,
  onDateChange,
  disabled = false,
  readOnly = false,
  onClick,
  id = "drawer-date",
  className,
}: DrawerDateFieldProps) {
  const dateLabel = displayValue ?? formatDateKeyShort(dateKey);

  if (readOnly || !onDateChange) {
    return (
      <div className={cn(APPOINTMENT_DRAWER_BOOKING_DATETIME_CELL_CLASS, className)}>
        <span className={APPOINTMENT_DRAWER_FIELD_LABEL_CLASS}>Date</span>
        <button
          type="button"
          onClick={onClick}
          disabled={!onClick}
          className={cn(
            APPOINTMENT_DRAWER_FIELD_CLASS,
            "flex w-full items-center gap-2 text-left",
            onClick ? "cursor-pointer hover:bg-violet-primary-surface/40" : "cursor-default",
          )}
        >
          <DrawerCalendarIcon />
          <span className="min-w-0 truncate text-[14px] font-medium text-[#1A1A1A]">
            {dateLabel}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={cn(APPOINTMENT_DRAWER_BOOKING_DATETIME_CELL_CLASS, className)}>
      <DrawerField
        label="Date"
        htmlFor={id}
        leading={<DrawerCalendarIcon />}
        disabled={disabled}
        fieldClassName="cursor-pointer"
        overlay={
          <Input
            id={id}
            type="date"
            value={dateKey}
            disabled={disabled}
            className="absolute inset-0 z-10 cursor-pointer opacity-0"
            onChange={(event) => {
              const next = event.target.value;
              if (next) onDateChange(next);
            }}
          />
        }
      >
        <span className="block truncate text-[14px] font-medium text-[#1A1A1A]">
          {dateLabel}
        </span>
      </DrawerField>
    </div>
  );
}
