"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  formatCancelledVisibilityLabel,
  formatVisibleHoursLabel,
  formatWeekStartLabel,
  formatZoomLevelLabel,
  TIME_OPTIONS,
  updateCancelledVisibility,
  updateHighContrast,
  updateVisibleHours,
  updateWeekStart,
  updateZoomLevel,
  WEEK_START_OPTIONS,
  ZOOM_LEVEL_OPTIONS,
  type CalendarDisplaySettings,
  type CalendarZoomLevel,
  type WeekStartsOn,
} from "@/features/calendar-display-settings/api/calendar-display-settings.api";
import { useCalendarDisplaySettings } from "@/features/calendar-display-settings/hooks/use-calendar-display-settings";
import { invalidateCalendarDisplaySettings } from "@/lib/query/invalidation";
import { SETTINGS_FORM_SECTION_STACK_CLASS } from "@/lib/design/settings-form-tokens";
import { cn } from "@/lib/utils";

function useSectionState<T extends Record<string, unknown>>(
  source: CalendarDisplaySettings | undefined,
  pick: (data: CalendarDisplaySettings) => T,
) {
  const [draft, setDraft] = useState<T | null>(null);

  useEffect(() => {
    if (source) {
      setDraft(pick(source));
    }
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

  return { values, isDirty, reset, commit };
}

export function DisplayPreferencesSettings() {
  const queryClient = useQueryClient();
  const canEdit = useCan(PERMISSIONS["settings.business"]);
  const { data, isLoading, isError, error } = useCalendarDisplaySettings();

  const visibleHours = useSectionState(data, (settings) => ({
    visibleStartTime: settings.visibleStartTime,
    visibleEndTime: settings.visibleEndTime,
  }));
  const weekStart = useSectionState(data, (settings) => ({
    weekStartsOn: settings.weekStartsOn,
  }));
  const zoomLevel = useSectionState(data, (settings) => ({
    zoomLevel: settings.zoomLevel,
  }));
  const cancelledVisibility = useSectionState(data, (settings) => ({
    showNormalCancellation: settings.showNormalCancellation,
    showLateCancellation: settings.showLateCancellation,
    showNoShow: settings.showNoShow,
  }));
  const highContrast = useSectionState(data, (settings) => ({
    highContrastEnabled: settings.highContrastEnabled,
  }));

  const [hoursDialogOpen, setHoursDialogOpen] = useState(false);
  const [weekStartDialogOpen, setWeekStartDialogOpen] = useState(false);
  const [zoomDialogOpen, setZoomDialogOpen] = useState(false);
  const [cancelledDialogOpen, setCancelledDialogOpen] = useState(false);
  const [dialogStart, setDialogStart] = useState("00:00");
  const [dialogEnd, setDialogEnd] = useState("24:00");
  const [dialogWeekStart, setDialogWeekStart] = useState<WeekStartsOn>("SUNDAY");
  const [dialogZoom, setDialogZoom] = useState<CalendarZoomLevel>("MEDIUM");
  const [dialogCancelled, setDialogCancelled] = useState({
    showNormalCancellation: true,
    showLateCancellation: true,
    showNoShow: true,
  });

  const mutation = useMutation({
    mutationFn: async (
      action: () => Promise<CalendarDisplaySettings>,
    ) => action(),
    onSuccess: async () => {
      await invalidateCalendarDisplaySettings(queryClient);
      toast.success("Display preferences saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const visibleHoursLabel = useMemo(() => {
    const start = visibleHours.values?.visibleStartTime ?? "00:00";
    const end = visibleHours.values?.visibleEndTime ?? "24:00";
    return formatVisibleHoursLabel(start, end);
  }, [visibleHours.values?.visibleEndTime, visibleHours.values?.visibleStartTime]);

  const weekStartLabel = useMemo(
    () => formatWeekStartLabel(weekStart.values?.weekStartsOn ?? "SUNDAY"),
    [weekStart.values?.weekStartsOn],
  );

  const zoomLabel = useMemo(
    () => formatZoomLevelLabel(zoomLevel.values?.zoomLevel ?? "MEDIUM"),
    [zoomLevel.values?.zoomLevel],
  );

  const cancelledLabel = useMemo(
    () =>
      formatCancelledVisibilityLabel(
        cancelledVisibility.values ?? {
          showNormalCancellation: true,
          showLateCancellation: true,
          showNoShow: true,
        },
      ),
    [cancelledVisibility.values],
  );

  if (isLoading) {
    return <LoadingState label="Loading display preferences…" />;
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error
          ? error.message
          : "Could not load display preferences"}
      </p>
    );
  }

  return (
    <SettingsFormPage
      title="Display Preferences"
      description="Configure how appointments appear on your calendar."
    >
      <div className={SETTINGS_FORM_SECTION_STACK_CLASS}>
        <SettingsValueSection
          title="Visible hours"
          description="Set the time range shown in day and week calendar views."
          valueLabel={visibleHoursLabel}
          onEdit={() => {
            setDialogStart(visibleHours.values?.visibleStartTime ?? "00:00");
            setDialogEnd(visibleHours.values?.visibleEndTime ?? "24:00");
            setHoursDialogOpen(true);
          }}
          onDiscard={visibleHours.reset}
          onSave={() =>
            mutation.mutate(() =>
              updateVisibleHours({
                visibleStartTime: visibleHours.values?.visibleStartTime ?? "00:00",
                visibleEndTime: visibleHours.values?.visibleEndTime ?? "24:00",
              }),
            )
          }
          isDirty={visibleHours.isDirty}
          isSaving={mutation.isPending}
          disabled={!canEdit}
        />

        <SettingsValueSection
          title="Week starts on"
          description="Choose the first day of the week in calendar views."
          valueLabel={weekStartLabel}
          onEdit={() => {
            setDialogWeekStart(weekStart.values?.weekStartsOn ?? "SUNDAY");
            setWeekStartDialogOpen(true);
          }}
          onDiscard={weekStart.reset}
          onSave={() =>
            mutation.mutate(() =>
              updateWeekStart({
                weekStartsOn: weekStart.values?.weekStartsOn ?? "SUNDAY",
              }),
            )
          }
          isDirty={weekStart.isDirty}
          isSaving={mutation.isPending}
          disabled={!canEdit}
        />

        <SettingsValueSection
          title="Zoom level"
          description="Adjust the vertical size of time slots in day and week views."
          valueLabel={zoomLabel}
          onEdit={() => {
            setDialogZoom(zoomLevel.values?.zoomLevel ?? "MEDIUM");
            setZoomDialogOpen(true);
          }}
          onDiscard={zoomLevel.reset}
          onSave={() =>
            mutation.mutate(() =>
              updateZoomLevel({
                zoomLevel: zoomLevel.values?.zoomLevel ?? "MEDIUM",
              }),
            )
          }
          isDirty={zoomLevel.isDirty}
          isSaving={mutation.isPending}
          disabled={!canEdit}
        />

        <SettingsValueSection
          title="Cancelled appointments"
          description="Choose which cancelled appointment types remain visible on the calendar."
          valueLabel={cancelledLabel}
          onEdit={() => {
            setDialogCancelled({
              showNormalCancellation:
                cancelledVisibility.values?.showNormalCancellation ?? true,
              showLateCancellation:
                cancelledVisibility.values?.showLateCancellation ?? true,
              showNoShow: cancelledVisibility.values?.showNoShow ?? true,
            });
            setCancelledDialogOpen(true);
          }}
          onDiscard={cancelledVisibility.reset}
          onSave={() =>
            mutation.mutate(() =>
              updateCancelledVisibility({
                showNormalCancellation:
                  cancelledVisibility.values?.showNormalCancellation ?? true,
                showLateCancellation:
                  cancelledVisibility.values?.showLateCancellation ?? true,
                showNoShow: cancelledVisibility.values?.showNoShow ?? true,
              }),
            )
          }
          isDirty={cancelledVisibility.isDirty}
          isSaving={mutation.isPending}
          disabled={!canEdit}
        />

        <SettingsToggleSection
          id="high-contrast-enabled"
          title="High contrast"
          description="Use stronger colors and borders for appointment blocks on the calendar."
          checked={highContrast.values?.highContrastEnabled ?? false}
          onCheckedChange={(checked) =>
            highContrast.commit({ highContrastEnabled: checked })
          }
          onDiscard={highContrast.reset}
          onSave={() =>
            mutation.mutate(() =>
              updateHighContrast({
                highContrastEnabled:
                  highContrast.values?.highContrastEnabled ?? false,
              }),
            )
          }
          isDirty={highContrast.isDirty}
          isSaving={mutation.isPending}
          disabled={!canEdit}
        />
      </div>

      <Dialog open={hoursDialogOpen} onOpenChange={setHoursDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Visible hours</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Start time</Label>
              <div className="grid max-h-48 gap-1 overflow-y-auto">
                {TIME_OPTIONS.filter((option) => option.value !== "24:00").map(
                  (option) => (
                    <Button
                      key={`start-${option.value}`}
                      type="button"
                      variant={dialogStart === option.value ? "brand" : "outline"}
                      size="sm"
                      onClick={() => setDialogStart(option.value)}
                    >
                      {option.label}
                    </Button>
                  ),
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>End time</Label>
              <div className="grid max-h-48 gap-1 overflow-y-auto">
                {TIME_OPTIONS.filter((option) => option.value !== "00:00").map(
                  (option) => (
                    <Button
                      key={`end-${option.value}`}
                      type="button"
                      variant={dialogEnd === option.value ? "brand" : "outline"}
                      size="sm"
                      onClick={() => setDialogEnd(option.value)}
                    >
                      {option.label}
                    </Button>
                  ),
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setHoursDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              onClick={() => {
                visibleHours.commit({
                  visibleStartTime: dialogStart,
                  visibleEndTime: dialogEnd,
                });
                setHoursDialogOpen(false);
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={weekStartDialogOpen} onOpenChange={setWeekStartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Week starts on</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {WEEK_START_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={dialogWeekStart === option.value ? "brand" : "outline"}
                onClick={() => setDialogWeekStart(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setWeekStartDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              onClick={() => {
                weekStart.commit({ weekStartsOn: dialogWeekStart });
                setWeekStartDialogOpen(false);
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={zoomDialogOpen} onOpenChange={setZoomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zoom level</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2">
            {ZOOM_LEVEL_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={dialogZoom === option.value ? "brand" : "outline"}
                onClick={() => setDialogZoom(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setZoomDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              onClick={() => {
                zoomLevel.commit({ zoomLevel: dialogZoom });
                setZoomDialogOpen(false);
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelledDialogOpen} onOpenChange={setCancelledDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelled appointments</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              {
                key: "showNormalCancellation" as const,
                label: "Normal cancellation",
              },
              {
                key: "showLateCancellation" as const,
                label: "Late cancellation",
              },
              { key: "showNoShow" as const, label: "No show" },
            ].map((item) => (
              <div
                key={item.key}
                className={cn(
                  "flex items-center justify-between rounded-md border px-3 py-2",
                  dialogCancelled[item.key] && "border-primary bg-primary/5",
                )}
              >
                <Label htmlFor={`cancelled-${item.key}`}>{item.label}</Label>
                <Switch
                  id={`cancelled-${item.key}`}
                  checked={dialogCancelled[item.key]}
                  onCheckedChange={(checked) =>
                    setDialogCancelled((current) => ({
                      ...current,
                      [item.key]: checked,
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelledDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              onClick={() => {
                cancelledVisibility.commit(dialogCancelled);
                setCancelledDialogOpen(false);
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
