"use client";

import { useMemo, useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CategorizedRegistryList, registryPickerPopoverClassName } from "@/features/automations/components/categorized-registry-list";
import {
  useAutomationActions,
  useAutomationCategories,
} from "@/features/automations/hooks/use-automation-metadata";

type ActionPickerProps = {
  value?: string | null;
  onValueChange: (actionKey: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export function ActionPicker({
  value,
  onValueChange,
  disabled,
  placeholder = "Select action",
  className,
}: ActionPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const categoriesQuery = useAutomationCategories("action");
  const actionsQuery = useAutomationActions();

  const selected = useMemo(
    () => actionsQuery.data?.find((action) => action.key === value),
    [actionsQuery.data, value],
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
            disabled={disabled || actionsQuery.isLoading}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Play className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{selected?.label ?? placeholder}</span>
            </span>
            <NavArrowIcon direction="down" size="lg" className="text-muted-foreground" />
          </Button>
        }
      />
      <PopoverContent align="start" className={registryPickerPopoverClassName}>
        <CategorizedRegistryList
          className="min-h-0 flex-1"
          listClassName="min-h-0 flex-1"
          items={actionsQuery.data ?? []}
          categories={categoriesQuery.data ?? []}
          search={search}
          onSearchChange={setSearch}
          selectedKey={value}
          onSelect={(key) => {
            onValueChange(key);
            setOpen(false);
          }}
          searchPlaceholder='Search actions, e.g. "email"'
        />
      </PopoverContent>
    </Popover>
  );
}
