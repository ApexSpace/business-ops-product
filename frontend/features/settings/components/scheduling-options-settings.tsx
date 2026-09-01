"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoadingState } from "@/components/data-display/loading-state";
import { SettingsFormPage } from "@/components/layout/settings-page-layout";
import { SettingsToggleSection } from "@/components/layout/settings-toggle-section";
import { SettingsValueSection } from "@/components/layout/settings-value-section";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import {
  formatRebookingJumpWeeksLabel,
  formatSlotIntervalLabel,
  REBOOKING_WEEK_OPTIONS,
  SLOT_INTERVAL_OPTIONS,
  updateSchedulingSettings,
  type SchedulingSettings,
} from "@/features/scheduling-settings/api/scheduling-settings.api";
import { useSchedulingSettings } from "@/features/scheduling-settings/hooks/use-scheduling-settings";
import { invalidateSchedulingSettings } from "@/lib/query/invalidation";
import { SETTINGS_FORM_SECTION_STACK_CLASS } from "@/lib/design/settings-form-tokens";
import { cn } from "@/lib/utils";

function useSectionState<T extends Record<string, unknown>>(
  source: SchedulingSettings | undefined,
  pick: (data: SchedulingSettings) => T,
) {
  const [draft, setDraft] = useState<T | null>(null);

  useEffect(() => {
    if (source) {
      setDraft(pick(source));
    }
    // pick is stable when defined outside the component
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const saved = source ? pick(source) : null;
  const values = draft ?? saved;
  const isDirty =
    saved != null &&
    values != null &&
    JSON.stringify(values) !== JSON.stringify(saved);

  const reset = useCallback(() => {
    if (saved) setDraft(saved);
  }, [saved]);

  const commit = useCallback((next: T) => {
    setDraft(next);
  }, []);

  return { values, saved, isDirty, reset, commit, setDraft };
}

export function SchedulingOptionsSettings() {
  const queryClient = useQueryClient();
  const canEdit = useCan(PERMISSIONS["settings.business"]);
  const { data, isLoading, isError, error } = useSchedulingSettings();

  const increment = useSectionState(data, (s) => ({
    slotIntervalMinutes: s.slotIntervalMinutes,
  }));
  const buffer = useSectionState(data, (s) => ({
    bufferTimeEnabled: s.bufferTimeEnabled,
    showBufferOnCalendar: s.showBufferOnCalendar,
  }));
  const processing = useSectionState(data, (s) => ({
    processingTimeEnabled: s.processingTimeEnabled,
  }));
  const rebooking = useSectionState(data, (s) => ({
    rebookingJumpWeeks: s.rebookingJumpWeeks,
  }));

  const [incrementDialogOpen, setIncrementDialogOpen] = useState(false);
  const [rebookingDialogOpen, setRebookingDialogOpen] = useState(false);
  const [dialogIncrement, setDialogIncrement] = useState(15);
  const [dialogWeeks, setDialogWeeks] = useState<number[]>([2, 3, 4, 5, 6, 7]);

  const mutation = useMutation({
    mutationFn: updateSchedulingSettings,
    onSuccess: async () => {
      await invalidateSchedulingSettings(queryClient);
      toast.success("Scheduling options saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveSection = useCallback(
    (body: Parameters<typeof updateSchedulingSettings>[0]) => {
      mutation.mutate(body);
    },
    [mutation],
  );

  const incrementLabel = useMemo(() => {
    const minutes = increment.values?.slotIntervalMinutes ?? 15;
    return formatSlotIntervalLabel(minutes);
  }, [increment.values?.slotIntervalMinutes]);

  const rebookingLabel = useMemo(
    () => formatRebookingJumpWeeksLabel(rebooking.values?.rebookingJumpWeeks ?? []),
    [rebooking.values?.rebookingJumpWeeks],
  );

  if (isLoading) {
    return <LoadingState label="Loading scheduling options…" />;
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Could not load scheduling options"}
      </p>
    );
  }

  return (
    <SettingsFormPage>
      <div className={SETTINGS_FORM_SECTION_STACK_CLASS}>
        <SettingsValueSection
          title="Appointment increment"
          description={
            <>
              Default time-slot step for new appointments and online booking.
              Per-calendar overrides remain in{" "}
              <Link href="/business/settings/calendars" className="text-primary underline-offset-2 hover:underline">
                Calendars
              </Link>
              .
            </>
          }
          valueLabel={incrementLabel}
          onEdit={() => {
            setDialogIncrement(increment.values?.slotIntervalMinutes ?? 15);
            setIncrementDialogOpen(true);
          }}
          onDiscard={increment.reset}
          onSave={() =>
            saveSection({
              slotIntervalMinutes: increment.values?.slotIntervalMinutes,
            })
          }
          isDirty={increment.isDirty}
          isSaving={mutation.isPending}
          disabled={!canEdit}
        />

        <SettingsToggleSection
          id="buffer-time-enabled"
          title="Buffer time"
          description={
            <>
              Enable buffer time before and after appointments. Configure per-service
              minutes in{" "}
              <Link href="/business/settings/services" className="text-primary underline-offset-2 hover:underline">
                Services
              </Link>
              .
            </>
          }
          checked={buffer.values?.bufferTimeEnabled ?? true}
          onCheckedChange={(checked) =>
            buffer.commit({
              bufferTimeEnabled: checked,
              showBufferOnCalendar: buffer.values?.showBufferOnCalendar ?? false,
            })
          }
          onDiscard={buffer.reset}
          onSave={() =>
            saveSection({
              bufferTimeEnabled: buffer.values?.bufferTimeEnabled,
              showBufferOnCalendar: buffer.values?.showBufferOnCalendar,
            })
          }
          isDirty={buffer.isDirty}
          isSaving={mutation.isPending}
          disabled={!canEdit}
        />

        {buffer.values?.bufferTimeEnabled ? (
          <SettingsToggleSection
            id="show-buffer-on-calendar"
            title="Show buffer on calendar"
            description="Display buffer bands before and after appointments in day and week views."
            checked={buffer.values.showBufferOnCalendar}
            onCheckedChange={(checked) =>
              buffer.commit({
                bufferTimeEnabled: buffer.values?.bufferTimeEnabled ?? true,
                showBufferOnCalendar: checked,
              })
            }
            onDiscard={buffer.reset}
            onSave={() =>
              saveSection({
                bufferTimeEnabled: buffer.values?.bufferTimeEnabled,
                showBufferOnCalendar: buffer.values?.showBufferOnCalendar,
              })
            }
            isDirty={buffer.isDirty}
            isSaving={mutation.isPending}
            disabled={!canEdit}
          />
        ) : null}

        <SettingsToggleSection
          id="processing-time-enabled"
          title="Processing & finishing"
          description={
            <>
              Enable processing and finishing time for services. Configure per-service
              durations in{" "}
              <Link href="/business/settings/services" className="text-primary underline-offset-2 hover:underline">
                Services
              </Link>
              .
            </>
          }
          checked={processing.values?.processingTimeEnabled ?? true}
          onCheckedChange={(checked) =>
            processing.commit({ processingTimeEnabled: checked })
          }
          onDiscard={processing.reset}
          onSave={() =>
            saveSection({
              processingTimeEnabled: processing.values?.processingTimeEnabled,
            })
          }
          isDirty={processing.isDirty}
          isSaving={mutation.isPending}
          disabled={!canEdit}
        />

        <SettingsValueSection
          title="Rebooking quick nav"
          description="Week-jump buttons shown in the calendar date picker when rebooking."
          valueLabel={rebookingLabel}
          onEdit={() => {
            setDialogWeeks(rebooking.values?.rebookingJumpWeeks ?? [2, 3, 4, 5, 6, 7]);
            setRebookingDialogOpen(true);
          }}
          onDiscard={rebooking.reset}
          onSave={() =>
            saveSection({
              rebookingJumpWeeks: rebooking.values?.rebookingJumpWeeks,
            })
          }
          isDirty={rebooking.isDirty}
          isSaving={mutation.isPending}
          disabled={!canEdit}
        />
      </div>

      <Dialog open={incrementDialogOpen} onOpenChange={setIncrementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appointment increment</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SLOT_INTERVAL_OPTIONS.map((minutes) => (
              <Button
                key={minutes}
                type="button"
                variant={dialogIncrement === minutes ? "brand" : "outline"}
                onClick={() => setDialogIncrement(minutes)}
              >
                {formatSlotIntervalLabel(minutes)}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIncrementDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              onClick={() => {
                increment.commit({ slotIntervalMinutes: dialogIncrement });
                setIncrementDialogOpen(false);
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rebookingDialogOpen} onOpenChange={setRebookingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rebooking quick nav</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Select up to 8 week intervals (1–12 weeks).
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {REBOOKING_WEEK_OPTIONS.map((week) => {
              const selected = dialogWeeks.includes(week);
              return (
                <div
                  key={week}
                  className={cn(
                    "flex items-center justify-between rounded-md border px-3 py-2",
                    selected && "border-primary bg-primary/5",
                  )}
                >
                  <Label htmlFor={`rebook-week-${week}`} className="text-sm">
                    {week === 1 ? "1 wk" : `${week} wks`}
                  </Label>
                  <Switch
                    id={`rebook-week-${week}`}
                    checked={selected}
                    onCheckedChange={(checked) => {
                      setDialogWeeks((current) => {
                        if (checked) {
                          if (current.length >= 8) {
                            toast.error("Select at most 8 intervals");
                            return current;
                          }
                          return [...current, week].sort((a, b) => a - b);
                        }
                        return current.filter((value) => value !== week);
                      });
                    }}
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRebookingDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              disabled={dialogWeeks.length === 0}
              onClick={() => {
                rebooking.commit({ rebookingJumpWeeks: dialogWeeks });
                setRebookingDialogOpen(false);
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsFormPage>
  );
}
