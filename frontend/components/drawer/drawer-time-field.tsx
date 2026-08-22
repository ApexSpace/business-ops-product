"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { DrawerChevronIcon, DrawerClockIcon } from "@/components/drawer/drawer-icons";
import {
  DRAWER_BOOKING_DATETIME_CELL_CLASS,
  DRAWER_FIELD_CLASS,
  DRAWER_FIELD_LABEL_CLASS,
  DRAWER_SELECT_TRIGGER_CLASS,
} from "@/lib/design/drawer-tokens";
import { cn } from "@/lib/utils";

export interface DrawerTimeFieldProps {
  value: number;
  timeLabel: string;
  timeSlots: number[];
  formatSlot: (minutes: number) => string;
  onValueChange?: (minutes: number) => void;
  disabled?: boolean;
  readOnly?: boolean;
  onClick?: () => void;
  id?: string;
  className?: string;
}

export function DrawerTimeField({
  value,
  timeLabel,
  timeSlots,
  formatSlot,
  onValueChange,
  disabled = false,
  readOnly = false,
  onClick,
  id = "drawer-time",
  className,
}: DrawerTimeFieldProps) {
  if (readOnly || !onValueChange) {
    return (
      <div className={cn(DRAWER_BOOKING_DATETIME_CELL_CLASS, className)}>
        <span className={DRAWER_FIELD_LABEL_CLASS}>Time</span>
        <button
          type="button"
          onClick={onClick}
          disabled={!onClick}
          className={cn(
            DRAWER_FIELD_CLASS,
            "flex w-full items-center gap-2 text-left",
            onClick ? "cursor-pointer hover:bg-violet-primary-surface/40" : "cursor-default",
          )}
        >
          <DrawerClockIcon />
          <span className="min-w-0 truncate text-[14px] font-medium text-[#1A1A1A]">
            {timeLabel}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={cn(DRAWER_BOOKING_DATETIME_CELL_CLASS, className)}>
      <span className={DRAWER_FIELD_LABEL_CLASS}>Time</span>
      <Select
        value={String(value)}
        onValueChange={(next) => onValueChange(Number(next))}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className={cn(
            DRAWER_SELECT_TRIGGER_CLASS,
            "flex w-full items-center gap-2 [&>svg]:hidden",
          )}
        >
          <span className="inline-flex shrink-0" aria-hidden>
            <DrawerClockIcon />
          </span>
          <span className="min-w-0 flex-1 truncate text-left text-[14px] font-medium text-[#1A1A1A]">
            {timeLabel}
          </span>
          <span className="inline-flex shrink-0" aria-hidden>
            <DrawerChevronIcon direction="down" />
          </span>
        </SelectTrigger>
        <SelectContent>
          {timeSlots.map((slot) => (
            <SelectItem key={slot} value={String(slot)}>
              {formatSlot(slot)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
