"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER_CLASS } from "@/lib/control-styles";
import { cn } from "@/lib/utils";
import type { CalendarViewMode } from "@/lib/calendar-dates";

const VIEWS: { value: CalendarViewMode; label: string }[] = [
  { value: "day", label: "Day view" },
  { value: "week", label: "Week view" },
  { value: "month", label: "Month view" },
  { value: "list", label: "List view" },
];

interface CalendarViewSwitcherProps {
  value: CalendarViewMode;
  onChange: (view: CalendarViewMode) => void;
  className?: string;
  triggerClassName?: string;
}

export function CalendarViewSwitcher({
  value,
  onChange,
  className,
  triggerClassName,
}: CalendarViewSwitcherProps) {
  const items = VIEWS.map((v) => ({ value: v.value, label: v.label }));

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as CalendarViewMode);
      }}
    >
      <SelectTrigger
        className={cn(
          FILTER_SELECT_TRIGGER_CLASS,
          "w-[130px]",
          className,
          triggerClassName,
        )}
        aria-label="Calendar view"
      >
        <SelectValue placeholder="View" />
      </SelectTrigger>
      <SelectContent>
        {VIEWS.map((v) => (
          <SelectItem key={v.value} value={v.value}>
            {v.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
