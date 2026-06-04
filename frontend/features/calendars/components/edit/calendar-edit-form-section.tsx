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


export function CalendarEditFormSection(props: CalendarEditSectionProps) {
  const { form, calendarType, calendarId, detail, availability, onAvailabilityChange, googleResources, googleCalendarOptions, isClassType, isMultiStaff } = props;
  return (

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Standard fields (name, email, phone) are always collected. Custom
            questions can be configured when the booking widget launches.
          </p>
          <FormField
            control={form.control}
            name="confirmationSettings"
            render={() => (
              <FormItem>
                <FormLabel>Success message</FormLabel>
                <FormControl>
                  <Input
                    value={
                      (
                        form.watch("confirmationSettings") as {
                          successMessage?: string;
                        }
                      )?.successMessage ?? ""
                    }
                    onChange={(e) =>
                      form.setValue("confirmationSettings", {
                        ...(form.getValues("confirmationSettings") ?? {}),
                        successMessage: e.target.value,
                      })
                    }
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmationSettings"
            render={() => (
              <FormItem>
                <FormLabel>Redirect URL</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://yoursite.com/thank-you"
                    value={
                      (
                        form.watch("confirmationSettings") as {
                          redirectUrl?: string;
                        }
                      )?.redirectUrl ?? ""
                    }
                    onChange={(e) =>
                      form.setValue("confirmationSettings", {
                        ...(form.getValues("confirmationSettings") ?? {}),
                        redirectUrl: e.target.value,
                      })
                    }
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      
  );
}
