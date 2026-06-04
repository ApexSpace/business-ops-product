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


export function CalendarEditStaffSection(props: CalendarEditSectionProps) {
  const { form, calendarType, calendarId, detail, availability, onAvailabilityChange, googleResources, googleCalendarOptions, isClassType, isMultiStaff } = props;
  return (

        <div className="space-y-4">
          {detail ? (
            <div className="rounded-lg border border-border/70 p-4">
              <p className="mb-2 font-medium">Assigned staff</p>
              {detail.staff.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No staff assigned yet. Add team members from Team settings, then
                  assign them here.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {detail.staff.map((s) => (
                    <li key={s.id} className="flex items-center justify-between">
                      <span>
                        {[s.user.firstName, s.user.lastName]
                          .filter(Boolean)
                          .join(" ") || s.user.email}
                      </span>
                      {s.isPrimary ? (
                        <span className="text-xs text-primary">Primary</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Staff assignment is managed via the calendar staff API after save.
              </p>
            </div>
          ) : null}
          <FormField
            control={form.control}
            name="locationType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location type</FormLabel>
                <SearchableSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  items={LOCATION_TYPE_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
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
                    placeholder="Address, phone number, or meeting link"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      
  );
}
