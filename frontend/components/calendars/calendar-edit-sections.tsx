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
import {
  CALENDAR_EDIT_SECTIONS,
  CALENDAR_TYPE_OPTIONS,
  DAY_LABELS,
  DURATION_PRESETS,
  LOCATION_TYPE_OPTIONS,
  SYNC_DIRECTION_OPTIONS,
  type CalendarDetail,
  type CalendarEditSectionId,
  type CalendarFormValues,
  type DayOfWeek,
  type CalendarType,
} from "@/lib/calendar-profile";
import { CalendarGoogleSyncPanel } from "@/components/calendars/calendar-google-sync-panel";
import type { IntegrationResourcesListResponse } from "@/lib/integration-resources";
import { cn } from "@/lib/utils";

type AvailabilitySlot = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
};

interface CalendarEditSectionsProps {
  form: UseFormReturn<CalendarFormValues>;
  sectionId: CalendarEditSectionId;
  calendarType: CalendarType;
  calendarId?: string;
  detail?: CalendarDetail;
  availability: AvailabilitySlot[];
  onAvailabilityChange: (slots: AvailabilitySlot[]) => void;
  googleResources?: IntegrationResourcesListResponse;
}

const CLASS_TYPES: CalendarType[] = ["CLASS_EVENT"];
const MULTI_STAFF_TYPES: CalendarType[] = [
  "ROUND_ROBIN",
  "COLLECTIVE",
  "CLASS_EVENT",
];

export function CalendarEditSectionNav({
  activeSection,
  onSectionChange,
}: {
  activeSection: CalendarEditSectionId;
  onSectionChange: (id: CalendarEditSectionId) => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5">
      {CALENDAR_EDIT_SECTIONS.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => onSectionChange(section.id)}
          className={cn(
            "rounded-md px-3 py-2 text-left text-sm transition-colors",
            activeSection === section.id
              ? "bg-primary/10 font-medium text-primary"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
}

export function CalendarEditSectionContent({
  form,
  sectionId,
  calendarType,
  calendarId,
  detail,
  availability,
  onAvailabilityChange,
  googleResources,
}: CalendarEditSectionsProps) {
  const googleCalendarOptions =
    googleResources?.resources.map((r) => ({
      value: r.id,
      label: r.name,
    })) ?? [];

  const isClassType = CLASS_TYPES.includes(calendarType);
  const isMultiStaff = MULTI_STAFF_TYPES.includes(calendarType);

  switch (sectionId) {
    case "basic":
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

    case "staff":
      return (
        <div className="space-y-4">
          {detail ? (
            <div className="rounded-lg border border-border/70 p-4">
              <p className="mb-2 font-medium">Assigned staff</p>
              {detail.staff.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No staff assigned yet. Add team members from Team settings, then
                  assign them here.
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
              <p className="mt-3 text-xs text-muted-foreground">
                Staff assignment is managed via the calendar staff API after save.
              </p>
            </div>
          ) : null}
          <FormField
            control={form.control}
            name="locationType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location type</FormLabel>
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
                    placeholder="Address, phone number, or meeting link"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      );

    case "availability":
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

    case "rules":
      return (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="defaultDurationMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meeting duration</FormLabel>
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
                  <FormLabel>Maximum booking window (days)</FormLabel>
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
                  <FormLabel>Slot interval (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      );

    case "advanced":
      return (
        <div className="space-y-4">
          {(isClassType || isMultiStaff) && (
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isClassType ? "Class capacity" : "Capacity per slot"}
                  </FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormDescription>
                    {isClassType
                      ? "Maximum participants per class session."
                      : "Maximum bookings per time slot."}
                  </FormDescription>
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
                <FormLabel className="!mt-0">Require approval</FormLabel>
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
          <FormItem className="flex items-center gap-2">
            <Checkbox checked disabled />
            <Label className="!mt-0 text-muted-foreground">
              Allow reschedule (stored for widget — coming soon)
            </Label>
          </FormItem>
          <FormItem className="flex items-center gap-2">
            <Checkbox checked disabled />
            <Label className="!mt-0 text-muted-foreground">
              Allow cancellation (stored for widget — coming soon)
            </Label>
          </FormItem>
        </div>
      );

    case "form":
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

    case "payments":
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

    case "notifications":
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

    case "widget":
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

    case "google":
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

    default:
      return null;
  }
}
