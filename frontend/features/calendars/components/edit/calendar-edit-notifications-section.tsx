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


export function CalendarEditNotificationsSection(props: CalendarEditSectionProps) {
  const { form, calendarType, calendarId, detail, availability, onAvailabilityChange, googleResources, googleCalendarOptions, isClassType, isMultiStaff } = props;
  return (

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="policySettings"
            render={() => (
              <FormItem>
                <FormLabel>Cancellation policy</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    value={
                      (
                        form.watch("policySettings") as {
                          cancellationPolicy?: string;
                        }
                      )?.cancellationPolicy ?? ""
                    }
                    onChange={(e) =>
                      form.setValue("policySettings", {
                        ...(form.getValues("policySettings") ?? {}),
                        cancellationPolicy: e.target.value,
                      })
                    }
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="policySettings"
            render={() => (
              <FormItem>
                <FormLabel>Reschedule policy</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    value={
                      (
                        form.watch("policySettings") as {
                          reschedulePolicy?: string;
                        }
                      )?.reschedulePolicy ?? ""
                    }
                    onChange={(e) =>
                      form.setValue("policySettings", {
                        ...(form.getValues("policySettings") ?? {}),
                        reschedulePolicy: e.target.value,
                      })
                    }
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="policySettings"
            render={() => (
              <FormItem>
                <FormLabel>No-show policy</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    value={
                      (
                        form.watch("policySettings") as { noShowPolicy?: string }
                      )?.noShowPolicy ?? ""
                    }
                    onChange={(e) =>
                      form.setValue("policySettings", {
                        ...(form.getValues("policySettings") ?? {}),
                        noShowPolicy: e.target.value,
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
