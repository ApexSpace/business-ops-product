"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  formatTimeSlotLabel,
  generateAppointmentTimeSlots,
} from "@/features/appointments/utils/appointment-service-lines";
import {
  APPOINTMENT_POPUP_DATETIME_CELL_CLASS,
  APPOINTMENT_POPUP_DATETIME_ROW_CLASS,
} from "@/features/appointments/styles/appointment-side-popup";
import { cn } from "@/lib/utils";

export interface AppointmentBookingDateTimeFieldsProps {
  dateKey: string;
  startMinutes: number;
  slotIntervalMinutes?: number;
  onDateChange: (dateKey: string) => void;
  onStartMinutesChange: (minutes: number) => void;
  disabled?: boolean;
  className?: string;
}

/** Formats YYYY-MM-DD → "Tue, Jul 28" for Figma date cell. */
function formatDateKeyLabel(dateKey: string): string {
  if (!dateKey) return "Select date";
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function AppointmentBookingDateTimeFields({
  dateKey,
  startMinutes,
  slotIntervalMinutes = 15,
  onDateChange,
  onStartMinutesChange,
  disabled = false,
  className,
}: AppointmentBookingDateTimeFieldsProps) {
  const timeSlots = generateAppointmentTimeSlots(slotIntervalMinutes);
  const selectedTimeLabel = formatTimeSlotLabel(startMinutes);
  const dateLabel = formatDateKeyLabel(dateKey);

  return (
    <div className={cn(APPOINTMENT_POPUP_DATETIME_ROW_CLASS, className)}>
      <label
        className={cn(
          APPOINTMENT_POPUP_DATETIME_CELL_CLASS,
          "relative cursor-pointer border-r border-[#BC9BF6]",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        {/* Figma Subhead: single-line “On Tue, Jul 28” */}
        <span className="truncate text-[14px] font-medium leading-none text-[#7E3BED]">
          On {dateLabel}
        </span>
        <Input
          type="date"
          value={dateKey}
          disabled={disabled}
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(event) => {
            const next = event.target.value;
            if (next) onDateChange(next);
          }}
        />
      </label>

      <div
        className={cn(
          APPOINTMENT_POPUP_DATETIME_CELL_CLASS,
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <Select
          value={String(startMinutes)}
          onValueChange={(value) => onStartMinutesChange(Number(value))}
          disabled={disabled}
        >
          <SelectTrigger className="h-auto w-full min-w-0 border-0 bg-transparent p-0 text-[14px] font-medium leading-none text-[#7E3BED] shadow-none hover:bg-transparent focus-visible:ring-0 data-[size=default]:h-auto [&_svg]:text-[#7E3BED]">
            <span className="truncate">At {selectedTimeLabel}</span>
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {timeSlots.map((minutes) => (
              <SelectItem key={minutes} value={String(minutes)}>
                {formatTimeSlotLabel(minutes)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
