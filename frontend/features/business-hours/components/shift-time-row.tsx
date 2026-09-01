"use client";

import { Clock, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BUSINESS_HOURS_DELETE_BUTTON_CLASS,
  BUSINESS_HOURS_SHIFT_FIELD_CLASS,
  BUSINESS_HOURS_SHIFT_ROW_CLASS,
  BUSINESS_HOURS_TIME_INPUT_CLASS,
} from "@/lib/design/business-hours-tokens";
import { cn } from "@/lib/utils";

interface ShiftTimeRowProps {
  startTime: string;
  endTime: string;
  disabled?: boolean;
  startLabel?: string;
  endLabel?: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onDelete?: () => void;
  className?: string;
}

export function ShiftTimeRow({
  startTime,
  endTime,
  disabled = false,
  startLabel = "Date",
  endLabel = "Time",
  onStartChange,
  onEndChange,
  onDelete,
  className,
}: ShiftTimeRowProps) {
  return (
    <div className={cn(BUSINESS_HOURS_SHIFT_ROW_CLASS, className)}>
      {onDelete ? (
        <button
          type="button"
          className={BUSINESS_HOURS_DELETE_BUTTON_CLASS}
          onClick={onDelete}
          disabled={disabled}
          aria-label="Remove shift"
        >
          <Trash2 className="size-4" />
        </button>
      ) : null}

      <div className={BUSINESS_HOURS_SHIFT_FIELD_CLASS}>
        <Label className="text-sm font-medium text-foreground">{startLabel}</Label>
        <div className="relative">
          <Clock
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="time"
            className={BUSINESS_HOURS_TIME_INPUT_CLASS}
            disabled={disabled}
            value={startTime}
            onChange={(e) => onStartChange(e.target.value)}
          />
        </div>
      </div>

      <div className={BUSINESS_HOURS_SHIFT_FIELD_CLASS}>
        <Label className="text-sm font-medium text-foreground">{endLabel}</Label>
        <div className="relative">
          <Clock
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="time"
            className={BUSINESS_HOURS_TIME_INPUT_CLASS}
            disabled={disabled}
            value={endTime}
            onChange={(e) => onEndChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
