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


export function CalendarEditBasicSection(props: CalendarEditSectionProps) {
  const { form, calendarType, calendarId, detail, availability, onAvailabilityChange, googleResources, googleCalendarOptions, isClassType, isMultiStaff } = props;
  return (

        <div className="space-y-4">
          <FormItem>
            <Label>Calendar logo</Label>
            <Input type="file" accept="image/*" disabled />
            <p className="text-sm text-muted-foreground">
              Logo upload coming soon.
            </p>
          </FormItem>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Calendar name</FormLabel>
                <FormControl>
                  <Input placeholder="Consultation calendar" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="Optional description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Calendar type</FormLabel>
                  <SearchableSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    items={CALENDAR_TYPE_OPTIONS.map((o) => ({
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
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <SearchableSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    items={[
                      { value: "ACTIVE", label: "Active" },
                      { value: "INACTIVE", label: "Inactive" },
                    ]}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="widgetSettings"
            render={() => (
              <FormItem>
                <FormLabel>Custom URL</FormLabel>
                <FormControl>
                  <div className="flex items-center overflow-hidden rounded-md border border-input">
                    <span className="shrink-0 border-r bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                      /book/
                    </span>
                    <Input
                      className="border-0 shadow-none focus-visible:ring-0"
                      value={
                        (form.watch("widgetSettings") as { bookingSlug?: string })
                          ?.bookingSlug ?? ""
                      }
                      onChange={(e) =>
                        form.setValue("widgetSettings", {
                          ...(form.getValues("widgetSettings") ?? {}),
                          bookingSlug: e.target.value,
                        })
                      }
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmationSettings"
            render={() => (
              <FormItem>
                <FormLabel>Meeting invite title</FormLabel>
                <FormControl>
                  <Input
                    value={
                      (
                        form.watch("confirmationSettings") as {
                          meetingInviteTitle?: string;
                        }
                      )?.meetingInviteTitle ?? ""
                    }
                    onChange={(e) =>
                      form.setValue("confirmationSettings", {
                        ...(form.getValues("confirmationSettings") ?? {}),
                        meetingInviteTitle: e.target.value,
                      })
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <Input type="color" className="h-10 w-full" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      
  );
}
