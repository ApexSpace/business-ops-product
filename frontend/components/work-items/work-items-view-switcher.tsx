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

export type WorkItemsView = "board" | "table";

const VIEWS: { value: WorkItemsView; label: string }[] = [
  { value: "board", label: "Board view" },
  { value: "table", label: "Table view" },
];

interface WorkItemsViewSwitcherProps {
  value: WorkItemsView;
  onChange: (view: WorkItemsView) => void;
  className?: string;
  triggerClassName?: string;
}

export function WorkItemsViewSwitcher({
  value,
  onChange,
  className,
  triggerClassName,
}: WorkItemsViewSwitcherProps) {
  const items = VIEWS.map((v) => ({ value: v.value, label: v.label }));

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as WorkItemsView);
      }}
    >
      <SelectTrigger
        className={cn(
          FILTER_SELECT_TRIGGER_CLASS,
          "w-[130px]",
          className,
          triggerClassName,
        )}
        aria-label="Work items view"
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
