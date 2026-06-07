"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DAY_LABELS } from "@/features/calendars/schemas/calendar-profile";
import type { CalendarEditSectionProps } from "@/features/calendars/components/edit/calendar-edit-types";
import { CalendarEditExceptionsPanel } from "@/features/calendars/components/edit/calendar-edit-exceptions-panel";

export function CalendarEditAvailabilityTabSection({
  form,
  calendarId,
  availability,
  onAvailabilityChange,
}: CalendarEditSectionProps) {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-medium">Working hours</h3>
          <p className="text-sm text-muted-foreground">
            When customers can book appointments each week.
          </p>
        </div>
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
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-base font-medium">Scheduling rules</h3>
          <p className="text-sm text-muted-foreground">
            Buffers and how far ahead customers can book.
          </p>
        </div>
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
                <FormLabel>How far ahead (days)</FormLabel>
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
                <FormLabel>Time slot interval (minutes)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </section>

      {calendarId ? (
        <CalendarEditExceptionsPanel calendarId={calendarId} />
      ) : null}
    </div>
  );
}
