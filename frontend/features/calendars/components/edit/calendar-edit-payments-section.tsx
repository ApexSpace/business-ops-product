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


export function CalendarEditPaymentsSection(props: CalendarEditSectionProps) {
  const { form, calendarType, calendarId, detail, availability, onAvailabilityChange, googleResources, googleCalendarOptions, isClassType, isMultiStaff } = props;
  return (

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Payment gateway integration is not enabled yet. These settings are
            stored for future use.
          </p>
          <FormField
            control={form.control}
            name="paymentSettings"
            render={() => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={
                      (
                        form.watch("paymentSettings") as {
                          requirePayment?: boolean;
                        }
                      )?.requirePayment === true
                    }
                    onCheckedChange={(v) =>
                      form.setValue("paymentSettings", {
                        ...(form.getValues("paymentSettings") ?? {}),
                        requirePayment: v === true,
                      })
                    }
                  />
                </FormControl>
                <FormLabel className="!mt-0">Require payment</FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paymentSettings"
            render={() => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={
                      (
                        form.watch("paymentSettings") as {
                          requireDeposit?: boolean;
                        }
                      )?.requireDeposit === true
                    }
                    onCheckedChange={(v) =>
                      form.setValue("paymentSettings", {
                        ...(form.getValues("paymentSettings") ?? {}),
                        requireDeposit: v === true,
                      })
                    }
                  />
                </FormControl>
                <FormLabel className="!mt-0">Require deposit</FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paymentSettings"
            render={() => (
              <FormItem>
                <FormLabel>Deposit amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={String(
                      (
                        form.watch("paymentSettings") as {
                          depositAmount?: number;
                        }
                      )?.depositAmount ?? "",
                    )}
                    onChange={(e) =>
                      form.setValue("paymentSettings", {
                        ...(form.getValues("paymentSettings") ?? {}),
                        depositAmount: Number(e.target.value) || undefined,
                      })
                    }
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paymentSettings"
            render={() => (
              <FormItem>
                <FormLabel>Payment instructions</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    value={
                      (
                        form.watch("paymentSettings") as {
                          instructions?: string;
                        }
                      )?.instructions ?? ""
                    }
                    onChange={(e) =>
                      form.setValue("paymentSettings", {
                        ...(form.getValues("paymentSettings") ?? {}),
                        instructions: e.target.value,
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
