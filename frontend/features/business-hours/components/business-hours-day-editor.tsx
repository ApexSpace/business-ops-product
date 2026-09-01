"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ShiftTimeRow } from "@/features/business-hours/components/shift-time-row";
import { SETTINGS_FORM_ACTIONS_CLASS, SETTINGS_FORM_DISCARD_BUTTON_CLASS } from "@/lib/design/settings-form-tokens";
import {
  BUSINESS_HOURS_DAY_LABEL_CLASS,
  BUSINESS_HOURS_EDITOR_HEADER_CLASS,
  BUSINESS_HOURS_EDITOR_PANEL_CLASS,
  BUSINESS_HOURS_EDITOR_SHELL_CLASS,
  BUSINESS_HOURS_TODAY_CHIP_CLASS,
} from "@/lib/design/business-hours-tokens";
import {
  formatDayRowLabel,
  weekdayLabel,
} from "@/features/business-hours/utils/format-business-hours";
import type { BusinessHoursSlot } from "@/features/business-hours/types";
import { cn } from "@/lib/utils";

interface BusinessHoursDayEditorProps {
  date: Date;
  slot: BusinessHoursSlot;
  draft: BusinessHoursSlot;
  isToday?: boolean;
  disabled?: boolean;
  isDirty?: boolean;
  isSaving?: boolean;
  onDraftChange: (draft: BusinessHoursSlot) => void;
  onClose: () => void;
  onDiscard: () => void;
  onSave: () => void;
  className?: string;
}

export function BusinessHoursDayEditor({
  date,
  slot,
  draft,
  isToday = false,
  disabled = false,
  isDirty = false,
  isSaving = false,
  onDraftChange,
  onClose,
  onDiscard,
  onSave,
  className,
}: BusinessHoursDayEditorProps) {
  const weekday = weekdayLabel(slot.dayOfWeek);

  return (
    <div className={cn(BUSINESS_HOURS_EDITOR_SHELL_CLASS, className)}>
      <div className={BUSINESS_HOURS_EDITOR_HEADER_CLASS}>
        <div className="flex min-w-0 items-center gap-[var(--spacing-2)]">
          <span
            className={cn(
              BUSINESS_HOURS_DAY_LABEL_CLASS,
              "text-violet-primary-normal",
            )}
          >
            {formatDayRowLabel(date)}
          </span>
          {isToday ? (
            <span className={BUSINESS_HOURS_TODAY_CHIP_CLASS}>TODAY</span>
          ) : null}
        </div>
        <button
          type="button"
          className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-xs)] text-muted-foreground hover:bg-black/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-primary-normal/30"
          onClick={onClose}
          aria-label="Close editor"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className={BUSINESS_HOURS_EDITOR_PANEL_CLASS}>
        <div className="flex flex-wrap items-center justify-between gap-[var(--spacing-3)]">
          <p className="text-sm font-medium text-muted-foreground">
            Every {weekday}
          </p>
          <div className="flex items-center gap-[var(--spacing-2)]">
            <Label htmlFor={`open-${slot.dayOfWeek}`} className="text-sm">
              Open
            </Label>
            <Switch
              id={`open-${slot.dayOfWeek}`}
              checked={draft.isEnabled}
              disabled={disabled}
              onCheckedChange={(checked) =>
                onDraftChange({ ...draft, isEnabled: checked })
              }
            />
          </div>
        </div>

        {draft.isEnabled ? (
          <ShiftTimeRow
            startTime={draft.startTime}
            endTime={draft.endTime}
            disabled={disabled}
            onStartChange={(startTime) =>
              onDraftChange({ ...draft, startTime })
            }
            onEndChange={(endTime) => onDraftChange({ ...draft, endTime })}
            onDelete={
              disabled
                ? undefined
                : () => onDraftChange({ ...draft, isEnabled: false })
            }
          />
        ) : null}

        <div className={SETTINGS_FORM_ACTIONS_CLASS}>
          <Button
            type="button"
            variant="outline"
            className={SETTINGS_FORM_DISCARD_BUTTON_CLASS}
            disabled={disabled || isSaving || !isDirty}
            onClick={onDiscard}
          >
            Discard
          </Button>
          <Button
            type="button"
            variant="brand"
            disabled={disabled || isSaving || !isDirty}
            onClick={onSave}
          >
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
