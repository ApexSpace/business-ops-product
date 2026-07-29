"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CategorizedRegistryList, registryPickerPopoverClassName } from "@/features/automations/components/categorized-registry-list";
import {
  useAutomationCategories,
  useAutomationTriggers,
} from "@/features/automations/hooks/use-automation-metadata";

type TriggerPickerProps = {
  value?: string | null;
  onValueChange: (triggerKey: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export function TriggerPicker({
  value,
  onValueChange,
  disabled,
  placeholder = "Select trigger",
  className,
}: TriggerPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const categoriesQuery = useAutomationCategories("trigger");
  const triggersQuery = useAutomationTriggers();

  const selected = useMemo(
    () => triggersQuery.data?.find((trigger) => trigger.key === value),
    [triggersQuery.data, value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn("w-full", className)}
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between font-normal"
            disabled={disabled || triggersQuery.isLoading}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Zap className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {selected?.label ?? placeholder}
              </span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        }
      />
      <PopoverContent align="start" className={registryPickerPopoverClassName}>
        <CategorizedRegistryList
          className="min-h-0 flex-1"
          listClassName="min-h-0 flex-1"
          items={triggersQuery.data ?? []}
          categories={categoriesQuery.data ?? []}
          search={search}
          onSearchChange={setSearch}
          selectedKey={value}
          onSelect={(key) => {
            onValueChange(key);
            setOpen(false);
          }}
          searchPlaceholder='Search triggers, e.g. "appointment"'
        />
      </PopoverContent>
    </Popover>
  );
}
