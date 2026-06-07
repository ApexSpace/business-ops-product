"use client";

import { SearchableSelect } from "@/components/forms/searchable-select";
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
import {
  CALENDAR_TYPE_OPTIONS,
  DURATION_PRESETS,
  LOCATION_TYPE_OPTIONS,
  getLocationValuePlaceholder,
} from "@/features/calendars/schemas/calendar-profile";
import { cn } from "@/lib/utils";
import type { CalendarEditSectionProps } from "@/features/calendars/components/edit/calendar-edit-types";

const FRIENDLY_TYPE_OPTIONS = CALENDAR_TYPE_OPTIONS.map((o) => ({
  ...o,
  label:
    o.value === "PERSONAL"
      ? "One-on-One"
      : o.value === "ROUND_ROBIN"
        ? "Round Robin"
        : o.value === "CLASS_EVENT"
          ? "Class / Group"
          : o.value === "COLLECTIVE"
            ? "Collective"
            : o.value === "SERVICE" || o.value === "STAFF"
              ? "Internal"
              : o.label,
}));

export function CalendarEditGeneralSection({
  form,
  detail,
}: CalendarEditSectionProps) {
  const locationType = form.watch("locationType");

  return (
    <div className="space-y-6">
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
              <Textarea
                rows={2}
                placeholder="Short description for your team"
                {...field}
              />
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
              <FormLabel>Booking type</FormLabel>
              <SearchableSelect
                value={field.value}
                onValueChange={field.onChange}
                items={FRIENDLY_TYPE_OPTIONS}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="defaultDurationMinutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration</FormLabel>
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
      </div>
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
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <SearchableSelect
                value={field.value}
                onValueChange={field.onChange}
                items={[
                  { value: "ACTIVE", label: "Active" },
                  { value: "INACTIVE", label: "Disabled" },
                ]}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="color"
        render={({ field }) => (
          <FormItem className="max-w-xs">
            <FormLabel>Color</FormLabel>
            <FormControl>
              <Input type="color" className="h-10 w-full" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {detail ? (
        <div className="rounded-lg border border-border/70 p-4">
          <p className="mb-2 font-medium">Assigned staff</p>
          {detail.staff.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No staff assigned. Add team members when creating the calendar or
              contact support to assign staff.
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
        </div>
      ) : null}

      <FormField
        control={form.control}
        name="locationType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Meeting location</FormLabel>
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
                placeholder={getLocationValuePlaceholder(locationType)}
                {...field}
              />
            </FormControl>
            <FormDescription>
              Shown on the booking page when customers schedule with you.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
