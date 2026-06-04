"use client";

import { useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
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
    <label
      className={cn(
        "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
        checked
          ? "border-primary bg-primary/[0.04] ring-1 ring-primary/20"
          : "border-border hover:bg-muted/40",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        type="radio"
        name="meeting-location-mode"
        className="mt-0.5 size-4 shrink-0 accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
        {hint ? (
          <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </span>
    </label>
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
  }, [selectedCalendar?.id, locationMode, form, selectedCalendar?.locationType, selectedCalendar?.locationValue]);

  const calendarSummary = selectedCalendar
    ? formatCalendarMeetingLocation(selectedCalendar)
    : null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Meeting location</p>

      {!calendarSelected ? (
        <p className="text-xs text-muted-foreground">
          Select a calendar to configure meeting location.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
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
            <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-3">
              <FormField
                control={form.control}
                name="locationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location type</FormLabel>
                    <SearchableSelect
                      items={LOCATION_TYPE_OPTIONS.map((o) => ({
                        value: o.value,
                        label: o.label,
                      }))}
                      value={field.value ?? "PHYSICAL"}
                      onValueChange={field.onChange}
                      disabled={disabled}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="locationValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location details</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={getLocationValuePlaceholder(
                          watchedLocationType ?? "PHYSICAL",
                        )}
                        disabled={disabled}
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
