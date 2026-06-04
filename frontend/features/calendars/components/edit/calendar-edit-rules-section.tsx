"use client";

import type { UseFormReturn } from "react-hook-form";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CALENDAR_TYPE_OPTIONS,
  DAY_LABELS,
  DURATION_PRESETS,
  LOCATION_TYPE_OPTIONS,
  type CalendarDetail,
  type CalendarFormValues,
  type DayOfWeek,
  type CalendarType,
} from "@/features/calendars/schemas/calendar-profile";
import type { IntegrationResourcesListResponse } from "@/features/integrations/utils/integration-resources";
import { cn } from "@/lib/utils";
import type { CalendarEditSectionProps } from "@/features/calendars/components/edit/calendar-edit-types";


export function CalendarEditRulesSection(props: CalendarEditSectionProps) {
  const { form, calendarType, calendarId, detail, availability, onAvailabilityChange, googleResources, googleCalendarOptions, isClassType, isMultiStaff } = props;
  return (

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="defaultDurationMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meeting duration</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {DURATION_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => field.onChange(preset.value)}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-sm",
                        field.value === preset.value
                          ? "border-primary bg-primary/10 font-medium text-primary"
                          : "border-border hover:bg-muted/50",
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="bufferBeforeMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Buffer before (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bufferAfterMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Buffer after (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="minimumNoticeMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum notice (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxBookingDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum booking window (days)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slotIntervalMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slot interval (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      
  );
}
