"use client";

import { useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
import {
  APPOINTMENT_FIELD_CONTROL_CLASS,
  APPOINTMENT_FIELD_LABEL_CLASS,
  APPOINTMENT_FORM_ITEM_CLASS,
} from "@/features/appointments/components/appointment-form-drawer-shell";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/forms/searchable-select";
import type { AppointmentFormValues } from "@/features/appointments/schemas/appointment-profile";
import {
  formatCalendarMeetingLocation,
  getLocationValuePlaceholder,
  LOCATION_TYPE_OPTIONS,
  type AppointmentLocationMode,
  type Calendar,
} from "@/features/calendars/schemas/calendar-profile";
import { cn } from "@/lib/utils";

interface AppointmentMeetingLocationFieldsProps {
  selectedCalendar?: Calendar | null;
  locationMode: AppointmentLocationMode;
  onLocationModeChange: (mode: AppointmentLocationMode) => void;
  disabled?: boolean;
}

function LocationModeOption({
  checked,
  title,
  description,
  hint,
  disabled,
  onSelect,
}: {
  checked: boolean;
  title: string;
  description: string;
  hint?: string;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col items-start rounded-xl border-[1.5px] p-3.5 text-left transition-colors",
        checked
          ? "border-primary bg-primary/5"
          : "border-border hover:border-border/80",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span
        className={cn(
          "mb-2.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2",
          checked ? "border-primary" : "border-border",
        )}
        aria-hidden
      >
        {checked ? <span className="size-2.5 rounded-full bg-primary" /> : null}
      </span>
      <span className="text-[13.5px] font-semibold text-foreground">{title}</span>
      <span className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
        {description}
      </span>
      {hint ? (
        <span className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </button>
  );
}

export function AppointmentMeetingLocationFields({
  selectedCalendar,
  locationMode,
  onLocationModeChange,
  disabled,
}: AppointmentMeetingLocationFieldsProps) {
  const form = useFormContext<AppointmentFormValues>();
  const calendarSelected = Boolean(selectedCalendar?.id);
  const watchedLocationType = form.watch("locationType");
  const syncedCalendarId = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedCalendar?.id || locationMode !== "calendar_default") {
      if (locationMode !== "calendar_default") {
        syncedCalendarId.current = null;
      }
      return;
    }
    if (syncedCalendarId.current === selectedCalendar.id) return;
    syncedCalendarId.current = selectedCalendar.id;
    form.setValue("locationType", selectedCalendar.locationType, {
      shouldDirty: false,
      shouldValidate: false,
    });
    form.setValue("locationValue", selectedCalendar.locationValue ?? "", {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [
    selectedCalendar?.id,
    locationMode,
    form,
    selectedCalendar?.locationType,
    selectedCalendar?.locationValue,
  ]);

  const calendarSummary = selectedCalendar
    ? formatCalendarMeetingLocation(selectedCalendar)
    : null;

  const fieldControlClass = APPOINTMENT_FIELD_CONTROL_CLASS;
  const fieldLabelClass = APPOINTMENT_FIELD_LABEL_CLASS;
  const formItemClass = APPOINTMENT_FORM_ITEM_CLASS;

  return (
    <div className={cn(formItemClass, "mb-0")}>
      <p className={fieldLabelClass}>Meeting location</p>

      {!calendarSelected ? (
        <p className="text-xs text-muted-foreground">
          Select a calendar to configure meeting location.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <LocationModeOption
              checked={locationMode === "calendar_default"}
              title="Calendar default"
              description="As configured in the calendar"
              hint={calendarSummary ?? undefined}
              disabled={disabled}
              onSelect={() => onLocationModeChange("calendar_default")}
            />
            <LocationModeOption
              checked={locationMode === "custom"}
              title="Custom"
              description="Set specific to this appointment"
              disabled={disabled}
              onSelect={() => onLocationModeChange("custom")}
            />
          </div>

          {locationMode === "custom" ? (
            <div className="mt-4 space-y-4 rounded-xl border border-border/60 bg-muted/15 p-4">
              <FormField
                control={form.control}
                name="locationType"
                render={({ field }) => (
                  <FormItem className={cn(formItemClass, "mb-0")}>
                    <FormLabel className={fieldLabelClass}>Location type</FormLabel>
                    <SearchableSelect
                      items={LOCATION_TYPE_OPTIONS.map((option) => ({
                        value: option.value,
                        label: option.label,
                      }))}
                      value={field.value ?? "PHYSICAL"}
                      onValueChange={field.onChange}
                      disabled={disabled}
                      triggerClassName={fieldControlClass}
                      inDialog
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="locationValue"
                render={({ field }) => (
                  <FormItem className={cn(formItemClass, "mb-0")}>
                    <FormLabel className={fieldLabelClass}>Location details</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={getLocationValuePlaceholder(
                          watchedLocationType ?? "PHYSICAL",
                        )}
                        disabled={disabled}
                        className={fieldControlClass}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
