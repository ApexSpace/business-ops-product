"use client";

import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { AppointmentFormValues } from "@/features/appointments/schemas/appointment-profile";
import type { Calendar } from "@/features/calendars/schemas/calendar-profile";
import {
  formatSlotRangeLabel,
  generateTimeSlots,
  getCalendarSchedulingConfig,
  getDefaultEndMinutes,
  parseStartEndLocalInputs,
  resolveInitialSchedule,
  syncStartEndFields,
} from "@/features/appointments/utils/appointment-scheduling";
import { todayDateKeyInTimezone } from "@/features/calendars/utils/timezone";
import { cn } from "@/lib/utils";

interface AppointmentScheduleFieldsProps {
  selectedCalendar?: Calendar | null;
  timezone: string;
  disabled?: boolean;
}

export function AppointmentScheduleFields({
  selectedCalendar,
  timezone,
  disabled,
}: AppointmentScheduleFieldsProps) {
  const form = useFormContext<AppointmentFormValues>();
  const config = getCalendarSchedulingConfig(selectedCalendar);
  const calendarSelected = Boolean(selectedCalendar?.id);

  const startAt = useWatch({ control: form.control, name: "startAt" }) ?? "";
  const endAt = useWatch({ control: form.control, name: "endAt" }) ?? "";

  const startError = form.formState.errors.startAt?.message;
  const endError = form.formState.errors.endAt?.message;
  const scheduleError =
    typeof startError === "string"
      ? startError
      : typeof endError === "string"
        ? endError
        : null;

  const schedule = useMemo(() => {
    const parsed = parseStartEndLocalInputs(startAt, endAt);
    if (parsed) {
      return resolveInitialSchedule(startAt, endAt, config, timezone);
    }
    const dateKey = todayDateKeyInTimezone(timezone);
    const startMinutes = 9 * 60;
    return {
      dateKey,
      startMinutes,
      endMinutes: getDefaultEndMinutes(
        startMinutes,
        config.defaultDurationMinutes,
        config.slotIntervalMinutes,
      ),
    };
  }, [
    startAt,
    endAt,
    config.slotIntervalMinutes,
    config.defaultDurationMinutes,
    timezone,
  ]);

  const timeSlots = useMemo(
    () => generateTimeSlots(config.slotIntervalMinutes),
    [config.slotIntervalMinutes],
  );

  const applySlot = (dateKey: string, startMinutes: number) => {
    const endMinutes = getDefaultEndMinutes(
      startMinutes,
      config.defaultDurationMinutes,
      config.slotIntervalMinutes,
    );
    const { startAt: nextStart, endAt: nextEnd } = syncStartEndFields(
      dateKey,
      startMinutes,
      endMinutes,
    );
    form.setValue("startAt", nextStart, { shouldDirty: true, shouldValidate: false });
    form.setValue("endAt", nextEnd, { shouldDirty: true, shouldValidate: false });
  };

  const slotValue = calendarSelected ? String(schedule.startMinutes) : "";
  const selectedSlotLabel =
    calendarSelected && slotValue
      ? formatSlotRangeLabel(
          schedule.startMinutes,
          config.defaultDurationMinutes,
        )
      : null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <FormItem>
          <Label>Date</Label>
          <Input
            type="date"
            value={schedule.dateKey}
            disabled={disabled || !calendarSelected}
            onChange={(e) => {
              const dateKey = e.target.value;
              if (!dateKey) return;
              applySlot(dateKey, schedule.startMinutes);
            }}
          />
        </FormItem>

        <FormItem>
          <Label>Time slot</Label>
          <Select
            value={slotValue}
            onValueChange={(value) => {
              applySlot(schedule.dateKey, Number(value));
            }}
            disabled={disabled || !calendarSelected}
          >
            <SelectTrigger className="w-full">
              <span
                className={
                  selectedSlotLabel
                    ? "truncate"
                    : "truncate text-muted-foreground"
                }
              >
                {selectedSlotLabel ?? "Select slot"}
              </span>
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {timeSlots.map((minutes) => (
                <SelectItem key={minutes} value={String(minutes)}>
                  {formatSlotRangeLabel(
                    minutes,
                    config.defaultDurationMinutes,
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormItem>
      </div>

      {!calendarSelected ? (
        <p className="text-xs text-muted-foreground">
          Select a calendar to pick a date and time slot.
        </p>
      ) : null}

      {scheduleError ? (
        <p className={cn("text-sm text-destructive")}>{scheduleError}</p>
      ) : null}
    </div>
  );
}
