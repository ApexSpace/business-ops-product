"use client";

import { Clock } from "lucide-react";
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
  DRAWER_FIELD_CONTROL_CLASS,
  DRAWER_FIELD_LABEL_CLASS,
  DRAWER_FORM_FIELD_CLASS,
  DRAWER_FORM_ITEM_CLASS,
} from "@/lib/design/drawer-shell-tokens";
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

  return (
    <div className={cn(DRAWER_FORM_ITEM_CLASS, className)}>
      <div className="grid grid-cols-2 gap-3">
        <div className={DRAWER_FORM_FIELD_CLASS}>
          <span className={DRAWER_FIELD_LABEL_CLASS}>Date</span>
          <Input
            type="date"
            value={dateKey}
            disabled={disabled}
            className={cn(DRAWER_FIELD_CONTROL_CLASS, "w-full")}
            onChange={(event) => {
              const next = event.target.value;
              if (next) onDateChange(next);
            }}
          />
        </div>

        <div className={DRAWER_FORM_FIELD_CLASS}>
          <span className={DRAWER_FIELD_LABEL_CLASS}>Time</span>
          <Select
            value={String(startMinutes)}
            onValueChange={(value) => onStartMinutesChange(Number(value))}
            disabled={disabled}
          >
            <SelectTrigger
              className={cn(
                "w-full data-[size=default]:h-11",
                DRAWER_FIELD_CONTROL_CLASS,
              )}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                <Clock className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{selectedTimeLabel}</span>
              </span>
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
    </div>
  );
}
