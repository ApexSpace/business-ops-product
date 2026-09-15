"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { TimePickerValue } from "@/features/time-clock/utils/time-picker";

type TimePickerFieldProps = {
  value: TimePickerValue;
  onChange: (value: TimePickerValue) => void;
  placeholder?: string;
};

export function TimePickerField({
  value,
  onChange,
  placeholder = "Select Time",
}: TimePickerFieldProps) {
  const empty = !value.hour && !value.minute;

  if (empty && placeholder) {
    return (
      <button
        type="button"
        className="text-left text-sm text-muted-foreground underline-offset-2 hover:underline"
        onClick={() => onChange({ hour: "09", minute: "00", period: "AM" })}
      >
        {placeholder}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        className="w-12 px-2 text-center"
        value={value.hour}
        maxLength={2}
        inputMode="numeric"
        onChange={(e) =>
          onChange({
            ...value,
            hour: e.target.value.replace(/\D/g, "").slice(0, 2),
          })
        }
      />
      <span>:</span>
      <Input
        className="w-12 px-2 text-center"
        value={value.minute}
        maxLength={2}
        inputMode="numeric"
        onChange={(e) =>
          onChange({
            ...value,
            minute: e.target.value.replace(/\D/g, "").slice(0, 2),
          })
        }
      />
      <Select
        value={value.period}
        onValueChange={(period) =>
          onChange({ ...value, period: period as "AM" | "PM" })
        }
      >
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
