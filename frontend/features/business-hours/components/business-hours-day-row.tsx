"use client";

import { AlertTriangle, SquarePen } from "lucide-react";
import {
  BUSINESS_HOURS_DAY_LABEL_CLASS,
  BUSINESS_HOURS_DAY_ROW_CLASS,
  BUSINESS_HOURS_DAY_STATUS_CLASS,
  BUSINESS_HOURS_TODAY_CHIP_CLASS,
  BUSINESS_HOURS_WARNING_CLASS,
} from "@/features/business-hours/utils/business-hours-tokens";
import {
  formatDayRowLabel,
  formatHoursSummary,
  slotNeedsAttention,
} from "@/features/business-hours/utils/format-business-hours";
import type { BusinessHoursSlot } from "@/features/business-hours/types";
import { cn } from "@/lib/utils";

interface BusinessHoursDayRowProps {
  date: Date;
  slot: BusinessHoursSlot;
  isToday?: boolean;
  isExpanded?: boolean;
  disabled?: boolean;
  onEdit: () => void;
  className?: string;
}

export function BusinessHoursDayRow({
  date,
  slot,
  isToday = false,
  isExpanded = false,
  disabled = false,
  onEdit,
  className,
}: BusinessHoursDayRowProps) {
  const needsAttention = slotNeedsAttention(slot);

  if (isExpanded) {
    return null;
  }

  return (
    <div className={cn(BUSINESS_HOURS_DAY_ROW_CLASS, className)}>
      <div className="flex min-w-0 items-center gap-[var(--spacing-2)]">
        <span className={BUSINESS_HOURS_DAY_LABEL_CLASS}>
          {formatDayRowLabel(date)}
        </span>
        {isToday ? (
          <span className={BUSINESS_HOURS_TODAY_CHIP_CLASS}>TODAY</span>
        ) : null}
      </div>

      <div className={BUSINESS_HOURS_DAY_STATUS_CLASS}>
        {needsAttention ? (
          <span className={BUSINESS_HOURS_WARNING_CLASS}>
            <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
            Needs hours
          </span>
        ) : (
          <span>{formatHoursSummary(slot)}</span>
        )}
      </div>

      <button
        type="button"
        className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-xs)] text-violet-primary-normal hover:bg-violet-primary-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-primary-normal/30 disabled:pointer-events-none disabled:opacity-50"
        onClick={onEdit}
        disabled={disabled}
        aria-label={`Edit hours for ${formatDayRowLabel(date)}`}
      >
        <SquarePen className="size-4" />
      </button>
    </div>
  );
}
