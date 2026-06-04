"use client";

import type { UseFormReturn } from "react-hook-form";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  SYNC_DIRECTION_OPTIONS,
  type CalendarFormValues,
} from "@/features/calendars/schemas/calendar-profile";
import { CalendarGoogleSyncPanel } from "@/features/calendars/components/calendar-google-sync-panel";
import type { IntegrationResourcesListResponse } from "@/features/integrations/utils/integration-resources";

interface CalendarEditGoogleSectionProps {
  form: UseFormReturn<CalendarFormValues>;
  calendarId?: string;
  googleResources?: IntegrationResourcesListResponse;
  googleCalendarOptions: { value: string; label: string }[];
}

export function CalendarEditGoogleSection({
  form,
  calendarId,
  googleResources,
  googleCalendarOptions,
}: CalendarEditGoogleSectionProps) {
  return (
    <div className="space-y-4">
      {calendarId ? (
        <CalendarGoogleSyncPanel
          calendarId={calendarId}
          form={form}
          googleResources={googleResources}
        />
      ) : null}
      <p className="text-sm text-muted-foreground">
        Connect Google Calendar in Settings → Integrations, sync your calendar
        list, then choose which Google calendar maps to this internal calendar.
      </p>
      <FormField
        control={form.control}
        name="googleSyncEnabled"
        render={({ field }) => (
          <FormItem className="flex items-center gap-2">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
            </FormControl>
            <FormLabel className="!mt-0">Enable Google Calendar sync</FormLabel>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="googleSyncDirection"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Sync direction</FormLabel>
            <SearchableSelect
              value={field.value}
              onValueChange={field.onChange}
              items={SYNC_DIRECTION_OPTIONS.map((o) => ({
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
        name="googleIntegrationResourceId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Default Google calendar</FormLabel>
            <SearchableSelect
              value={field.value ?? ""}
              onValueChange={field.onChange}
              items={[
                { value: "", label: "None — connect Google Calendar first" },
                ...googleCalendarOptions,
              ]}
              placeholder="Select synced calendar"
            />
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
