"use client";

import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import {
  FORM_DRAWER_FIELD_CONTROL_CLASS,
  FORM_DRAWER_FIELD_LABEL_CLASS,
  FORM_DRAWER_FORM_ITEM_CLASS,
} from "@/components/forms/form-drawer-shell";
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

  const fieldControlClass = FORM_DRAWER_FIELD_CONTROL_CLASS;
  const fieldLabelClass = FORM_DRAWER_FIELD_LABEL_CLASS;
  const formItemClass = FORM_DRAWER_FORM_ITEM_CLASS;

  return (
    <div className="mb-4">
      <div className="grid grid-cols-2 gap-3.5">
        <FormItem className={cn(formItemClass, "mb-0")}>
          <Label className={fieldLabelClass} required>
            Date
          </Label>
          <div className="relative">
            <Input
              type="date"
              value={schedule.dateKey}
              disabled={disabled || !calendarSelected}
              className={cn(fieldControlClass, "pr-10")}
              onChange={(event) => {
                const dateKey = event.target.value;
                if (!dateKey) return;
                applySlot(dateKey, schedule.startMinutes);
              }}
            />
            <CalendarDays
              className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
          </div>
        </FormItem>

        <FormItem className={cn(formItemClass, "mb-0")}>
          <Label className={fieldLabelClass} required>
            Time slot
          </Label>
          <Select
            value={slotValue}
            onValueChange={(value) => {
              applySlot(schedule.dateKey, Number(value));
            }}
            disabled={disabled || !calendarSelected}
          >
            <SelectTrigger className={cn("w-full", fieldControlClass)}>
              <span
                className={cn(
                  "truncate font-medium",
                  !selectedSlotLabel && "font-normal text-muted-foreground",
                )}
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
        <p className="mt-2 text-xs text-muted-foreground">
          Select a calendar to pick a date and time slot.
        </p>
      ) : null}

      {scheduleError ? (
        <p className="mt-2 text-sm text-destructive">{scheduleError}</p>
      ) : null}
    </div>
  );
}
