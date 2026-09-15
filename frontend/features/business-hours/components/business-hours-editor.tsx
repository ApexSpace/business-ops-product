"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DAY_LABELS,
  normalizeBusinessHoursSlots,
} from "@/features/business-hours/utils/default-business-hours";
import type { BusinessHoursSlot } from "@/features/business-hours/types";

interface BusinessHoursEditorProps {
  slots: BusinessHoursSlot[];
  disabled?: boolean;
  onChange: (slots: BusinessHoursSlot[]) => void;
}

export function BusinessHoursEditor({
  slots,
  disabled = false,
  onChange,
}: BusinessHoursEditorProps) {
  const rows = normalizeBusinessHoursSlots(slots);

  const updateRow = (index: number, patch: Partial<BusinessHoursSlot>) => {
    const next = [...rows];
    next[index] = { ...rows[index]!, ...patch,
};
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {rows.map((slot, index) => (
        <div
          key={slot.dayOfWeek}
          className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 p-3"
        >
          <label className="flex min-w-[120px] items-center gap-2 text-sm">
            <Checkbox
              checked={slot.isEnabled}
              disabled={disabled}
              onCheckedChange={(checked) =>
                updateRow(index, { isEnabled: checked === true })
              }
            />
            {DAY_LABELS[slot.dayOfWeek]}
          </label>
          <Input
            type="time"
            className="w-28"
            disabled={disabled || !slot.isEnabled}
            value={slot.startTime}
            onChange={(e) => updateRow(index, { startTime: e.target.value })}
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="time"
            className="w-28"
            disabled={disabled || !slot.isEnabled}
            value={slot.endTime}
            onChange={(e) => updateRow(index, { endTime: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}
