"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { CalendarEditSectionProps } from "@/features/calendars/components/edit/calendar-edit-types";
import { CalendarEditPaymentsSection } from "@/features/calendars/components/edit/calendar-edit-payments-section";
import { CalendarEditNotificationsSection } from "@/features/calendars/components/edit/calendar-edit-notifications-section";

export function CalendarEditAdvancedTabSection(
  props: CalendarEditSectionProps,
) {
  const { form, isClassType, isMultiStaff } = props;
  const [policiesOpen, setPoliciesOpen] = useState(false);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Optional settings for power users. Most businesses can leave these as
        defaults.
      </p>

      {(isClassType || isMultiStaff) && (
        <FormField
          control={form.control}
          name="capacity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {isClassType ? "Class capacity" : "Capacity per time slot"}
              </FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="requireApproval"
        render={({ field }) => (
          <FormItem className="flex items-center gap-2">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
            </FormControl>
            <FormLabel className="!mt-0">Require manual approval</FormLabel>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="autoConfirm"
        render={({ field }) => (
          <FormItem className="flex items-center gap-2">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
            </FormControl>
            <FormLabel className="!mt-0">Auto-confirm bookings</FormLabel>
          </FormItem>
        )}
      />

      <div className="rounded-lg border">
        <Button
          type="button"
          variant="ghost"
          className="flex h-auto w-full items-center justify-between px-4 py-3 text-sm font-medium"
          onClick={() => setPoliciesOpen((o) => !o)}
        >
          Policies & payments
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              policiesOpen && "rotate-180",
            )}
          />
        </Button>
        {policiesOpen ? (
          <div className="space-y-6 border-t px-4 py-4">
            <CalendarEditNotificationsSection {...props} />
            <CalendarEditPaymentsSection {...props} />
          </div>
        ) : null}
      </div>

      <div className="space-y-2 rounded-lg border border-dashed p-4 opacity-80">
        <Label className="text-muted-foreground">Coming soon</Label>
        <p className="text-sm text-muted-foreground">
          Customer self-service reschedule and cancellation will be available
          in a future update.
        </p>
      </div>
    </div>
  );
}
