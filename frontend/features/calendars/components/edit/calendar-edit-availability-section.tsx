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


export function CalendarEditAvailabilitySection(props: CalendarEditSectionProps) {
  const { form, calendarType, calendarId, detail, availability, onAvailabilityChange, googleResources, googleCalendarOptions, isClassType, isMultiStaff } = props;
  return (

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Set weekly hours when customers can book. Holiday and exception rules
            can be added in a future update.
          </p>
          {availability.map((slot, index) => (
            <div
              key={slot.dayOfWeek}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 p-3"
            >
              <label className="flex min-w-[120px] items-center gap-2 text-sm">
                <Checkbox
                  checked={slot.isEnabled}
                  onCheckedChange={(checked) => {
                    const next = [...availability];
                    next[index] = { ...slot, isEnabled: checked === true };
                    onAvailabilityChange(next);
                  }}
                />
                {DAY_LABELS[slot.dayOfWeek]}
              </label>
              <Input
                type="time"
                className="w-28"
                disabled={!slot.isEnabled}
                value={slot.startTime}
                onChange={(e) => {
                  const next = [...availability];
                  next[index] = { ...slot, startTime: e.target.value };
                  onAvailabilityChange(next);
                }}
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="time"
                className="w-28"
                disabled={!slot.isEnabled}
                value={slot.endTime}
                onChange={(e) => {
                  const next = [...availability];
                  next[index] = { ...slot, endTime: e.target.value };
                  onAvailabilityChange(next);
                }}
              />
            </div>
          ))}
        </div>
      
  );
}
