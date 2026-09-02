"use client";

import type {
  RemoveNotWorkingPreview,
  SetNotWorkingPreview,
} from "@/features/quick-tools/api/quick-tools.api";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type QuickToolsPreviewSummaryProps = {
  mode: "set" | "remove";
  preview: SetNotWorkingPreview | RemoveNotWorkingPreview;
  staffCount: number;
};

export function QuickToolsPreviewSummary({
  mode,
  preview,
  staffCount,
}: QuickToolsPreviewSummaryProps) {
  const appointmentCount = preview.appointmentCount;
  const skipped =
    mode === "set" && "skipped" in preview ? preview.skipped : [];

  const actionCount =
    mode === "set"
      ? (preview as SetNotWorkingPreview).exceptionsToCreate
      : (preview as RemoveNotWorkingPreview).exceptionsToRemove;

  return (
    <div className="space-y-3 text-sm">
      <p>
        <span className="font-medium">{staffCount}</span> staff member
        {staffCount === 1 ? "" : "s"} ×{" "}
        <span className="font-medium">{preview.daysAffected}</span> day
        {preview.daysAffected === 1 ? "" : "s"} —{" "}
        <span className="font-medium">{actionCount}</span> exception
        {actionCount === 1 ? "" : "s"}{" "}
        {mode === "set" ? "will be created or updated" : "will be removed"}.
      </p>

      {skipped.length > 0 ? (
        <div className="rounded-[var(--radius-control)] border border-border bg-muted/40 px-3 py-2 text-muted-foreground">
          {skipped.length} day{skipped.length === 1 ? "" : "s"} skipped because
          a partial-day schedule exception already exists.
        </div>
      ) : null}

      {appointmentCount > 0 ? (
        <div
          className={cn(
            "flex gap-2 rounded-[var(--radius-control)] border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive",
          )}
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            {appointmentCount} appointment
            {appointmentCount === 1 ? "" : "s"} exist in this range. Staff will
            still appear on the calendar; online booking will block these times.
            Existing appointments are not cancelled.
          </p>
        </div>
      ) : null}
    </div>
  );
}
