"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SettingsChoiceRadioGroup } from "@/components/forms/settings-choice-radio-group";
import { BusinessHoursWeekList } from "@/features/business-hours/components/business-hours-week-list";
import type {
  BusinessHoursSlot,
  DayOfWeek as BusinessDayOfWeek,
} from "@/features/business-hours/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  DayOfWeek,
  ResourceAvailabilitySlot,
  ResourceScheduleException,
} from "@/features/resources/types";
import {
  mergeBusinessHoursDay,
  resourceSlotsToBusinessHours,
} from "@/features/resources/utils/resource-availability-map.util";
import { normalizeAvailabilitySlots } from "@/features/resources/utils/resource-schedule.util";
import { SETTINGS_FORM_SECTION_STACK_CLASS } from "@/lib/design/settings-form-tokens";
import { cn } from "@/lib/utils";

type ResourceScheduleSectionProps = {
  resourceId: string;
  alwaysAvailable: boolean;
  availability: ResourceAvailabilitySlot[];
  scheduleExceptions: ResourceScheduleException[];
  isSavingAvailability?: boolean;
  isSavingAlwaysAvailable?: boolean;
  onSaveAlwaysAvailable: (alwaysAvailable: boolean) => Promise<void> | void;
  onSaveDay: (
    dayOfWeek: DayOfWeek,
    slots: ResourceAvailabilitySlot[],
  ) => Promise<void> | void;
  onAddException: (body: {
    date: string;
    isUnavailable: boolean;
    reason: string | null;
  }) => Promise<void> | void;
  onRemoveException: (exceptionId: string) => void;
};

export function ResourceScheduleSection({
  alwaysAvailable,
  availability,
  scheduleExceptions,
  isSavingAvailability = false,
  isSavingAlwaysAvailable = false,
  onSaveAlwaysAvailable,
  onSaveDay,
  onAddException,
  onRemoveException,
}: ResourceScheduleSectionProps) {
  const [mode, setMode] = useState<"always" | "specific">(
    alwaysAvailable ? "always" : "specific",
  );
  const [slots, setSlots] = useState(() =>
    normalizeAvailabilitySlots(availability),
  );
  const [exceptionDate, setExceptionDate] = useState("");
  const [exceptionReason, setExceptionReason] = useState("");

  useEffect(() => {
    setMode(alwaysAvailable ? "always" : "specific");
    setSlots(normalizeAvailabilitySlots(availability));
  }, [alwaysAvailable, availability]);

  const businessSlots = useMemo(
    () => resourceSlotsToBusinessHours(slots),
    [slots],
  );

  const handleModeChange = async (value: string) => {
    const next = value === "always" ? "always" : "specific";
    setMode(next);
    await onSaveAlwaysAvailable(next === "always");
  };

  const handleSaveDay = (
    dayOfWeek: BusinessDayOfWeek,
    slot: BusinessHoursSlot,
  ) => {
    const next = mergeBusinessHoursDay(
      slots,
      dayOfWeek as DayOfWeek,
      slot,
    );
    setSlots(next);
    void onSaveDay(dayOfWeek as DayOfWeek, next);
  };

  return (
    <div className={cn(SETTINGS_FORM_SECTION_STACK_CLASS, "max-w-3xl")}>
      <div className="space-y-[var(--spacing-4)]">
        <p className="text-sm font-medium text-foreground">
          At what times is this resource available?
        </p>
        <SettingsChoiceRadioGroup
          name="schedule-mode"
          aria-label="Resource availability mode"
          value={mode}
          onValueChange={(value) => void handleModeChange(value)}
          disabled={isSavingAlwaysAvailable}
          options={[
            {
              value: "always",
              label: "Always available",
              description:
                "Most common option where a resource is always available and not limited to certain days/times.",
            },
            {
              value: "specific",
              label: "Only available on specific days/times",
              description:
                "Advanced option for when a resource has a schedule and can only be booked on certain days or times.",
            },
          ]}
        />
      </div>

      {mode === "specific" ? (
        <BusinessHoursWeekList
          slots={businessSlots}
          isSaving={isSavingAvailability}
          onSaveDay={handleSaveDay}
        />
      ) : null}

      <div className="space-y-[var(--spacing-4)] border-t pt-[var(--spacing-6)]">
        <div>
          <h3 className="text-base font-medium">Schedule exceptions</h3>
          <p className="text-xs text-muted-foreground">
            Mark specific dates when this resource is unavailable.
          </p>
        </div>
        <ul className="space-y-2">
          {scheduleExceptions.map((ex) => (
            <li
              key={ex.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span>
                {ex.date}
                {ex.isUnavailable ? " · Unavailable" : ""}
                {ex.reason ? ` — ${ex.reason}` : ""}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveException(ex.id)}
              >
                Remove
              </Button>
            </li>
          ))}
          {scheduleExceptions.length === 0 ? (
            <li className="text-sm text-muted-foreground">No exceptions yet.</li>
          ) : null}
        </ul>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="exception-date">Date</Label>
            <Input
              id="exception-date"
              type="date"
              value={exceptionDate}
              onChange={(e) => setExceptionDate(e.target.value)}
            />
          </div>
          <div className="min-w-[200px] flex-1 space-y-1">
            <Label htmlFor="exception-reason">Reason (optional)</Label>
            <Textarea
              id="exception-reason"
              rows={1}
              value={exceptionReason}
              onChange={(e) => setExceptionReason(e.target.value)}
            />
          </div>
          <Button
            type="button"
            onClick={() => {
              if (!exceptionDate) {
                toast.error("Pick a date");
                return;
              }
              void Promise.resolve(
                onAddException({
                  date: exceptionDate,
                  isUnavailable: true,
                  reason: exceptionReason.trim() || null,
                }),
              ).then(() => {
                setExceptionDate("");
                setExceptionReason("");
              });
            }}
          >
            Add exception
          </Button>
        </div>
      </div>
    </div>
  );
}
