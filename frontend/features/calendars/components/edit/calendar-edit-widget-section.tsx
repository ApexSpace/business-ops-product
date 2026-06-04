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


export function CalendarEditWidgetSection(props: CalendarEditSectionProps) {
  const { form, calendarType, calendarId, detail, availability, onAvailabilityChange, googleResources, googleCalendarOptions, isClassType, isMultiStaff } = props;
  return (

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="widgetSettings"
            render={() => (
              <FormItem>
                <FormLabel>Widget title</FormLabel>
                <FormControl>
                  <Input
                    value={
                      (form.watch("widgetSettings") as { title?: string })
                        ?.title ?? ""
                    }
                    onChange={(e) =>
                      form.setValue("widgetSettings", {
                        ...(form.getValues("widgetSettings") ?? {}),
                        title: e.target.value,
                      })
                    }
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="widgetSettings"
            render={() => (
              <FormItem>
                <FormLabel>Button text</FormLabel>
                <FormControl>
                  <Input
                    value={
                      (form.watch("widgetSettings") as { buttonText?: string })
                        ?.buttonText ?? ""
                    }
                    onChange={(e) =>
                      form.setValue("widgetSettings", {
                        ...(form.getValues("widgetSettings") ?? {}),
                        buttonText: e.target.value,
                      })
                    }
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="widgetSettings"
            render={() => (
              <FormItem>
                <FormLabel>Thank you message</FormLabel>
                <FormControl>
                  <Textarea
                    rows={2}
                    value={
                      (
                        form.watch("widgetSettings") as {
                          thankYouMessage?: string;
                        }
                      )?.thankYouMessage ?? ""
                    }
                    onChange={(e) =>
                      form.setValue("widgetSettings", {
                        ...(form.getValues("widgetSettings") ?? {}),
                        thankYouMessage: e.target.value,
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
