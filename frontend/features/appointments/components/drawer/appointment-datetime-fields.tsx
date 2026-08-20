"use client";

import { DrawerDateTimeRow } from "@/components/drawer/drawer-datetime-row";
import { DrawerDateField } from "@/components/drawer/drawer-date-field";
import { DrawerTimeField } from "@/components/drawer/drawer-time-field";
import {
  formatTimeSlotLabel,
  generateAppointmentTimeSlots,
} from "@/features/appointments/utils/appointment-service-lines";
import { cn } from "@/lib/utils";

export interface AppointmentDateTimeFieldsProps {
  dateKey: string;
  startMinutes: number;
  slotIntervalMinutes?: number;
  onDateChange: (dateKey: string) => void;
  onStartMinutesChange: (minutes: number) => void;
  disabled?: boolean;
  className?: string;
}

export function AppointmentDateTimeFields({
  dateKey,
  startMinutes,
  slotIntervalMinutes = 15,
  onDateChange,
  onStartMinutesChange,
  disabled = false,
  className,
}: AppointmentDateTimeFieldsProps) {
  const timeSlots = generateAppointmentTimeSlots(slotIntervalMinutes);
  const selectedTimeLabel = formatTimeSlotLabel(startMinutes);

  return (
    <DrawerDateTimeRow className={className}>
      <DrawerDateField
        dateKey={dateKey}
        onDateChange={onDateChange}
        disabled={disabled}
        id="appointment-drawer-date"
      />
      <DrawerTimeField
        value={startMinutes}
        timeLabel={selectedTimeLabel}
        timeSlots={timeSlots}
        formatSlot={formatTimeSlotLabel}
        onValueChange={onStartMinutesChange}
        disabled={disabled}
        id="appointment-drawer-time"
      />
    </DrawerDateTimeRow>
  );
}

export interface AppointmentDateTimeDisplayProps {
  dateLabel: string;
  timeLabel: string;
  onDateClick?: () => void;
  onTimeClick?: () => void;
  className?: string;
}

export function AppointmentDateTimeDisplay({
  dateLabel,
  timeLabel,
  onDateClick,
  onTimeClick,
  className,
}: AppointmentDateTimeDisplayProps) {
  return (
    <DrawerDateTimeRow className={className}>
      <DrawerDateField
        displayValue={dateLabel}
        readOnly
        onClick={onDateClick}
      />
      <DrawerTimeField
        value={0}
        timeLabel={timeLabel}
        timeSlots={[]}
        formatSlot={() => timeLabel}
        readOnly
        onClick={onTimeClick}
      />
    </DrawerDateTimeRow>
  );
}