"use client";

import { useMemo } from "react";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { cn } from "@/lib/utils";
import { useAutomationActions, useAutomationCategories } from "@/features/automations/hooks/use-automation-metadata";

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
  const categoriesQuery = useAutomationCategories("action");
  const actionsQuery = useAutomationActions();

  const items = useMemo(() => {
    const categoryByKey = new Map(
      (categoriesQuery.data ?? []).map((category) => [category.key, category.label]),
    );
    return (actionsQuery.data ?? []).map((action) => ({
      value: action.key,
      label: action.label,
      description: [
        categoryByKey.get(action.category),
        action.description,
      ]
        .filter(Boolean)
        .join(" · "),
      disabled: action.activatable === false,
    }));
  }, [categoriesQuery.data, actionsQuery.data]);

  return (
    <SearchableSelect
      items={items}
      value={value ?? null}
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
      placeholder={placeholder}
      disabled={disabled || actionsQuery.isLoading}
      emptyMessage={
        actionsQuery.isLoading ? "Loading actions…" : "No matching actions"
      }
      triggerClassName={cn("w-full font-normal", className)}
    />
  );
}
