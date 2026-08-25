"use client";

import { useMemo } from "react";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { cn } from "@/lib/utils";
import { useAutomationCategories, useAutomationTriggers } from "@/features/automations/hooks/use-automation-metadata";

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
  const categoriesQuery = useAutomationCategories("trigger");
  const triggersQuery = useAutomationTriggers();

  const items = useMemo(() => {
    const categoryByKey = new Map(
      (categoriesQuery.data ?? []).map((category) => [category.key, category.label]),
    );
    return (triggersQuery.data ?? []).map((trigger) => ({
      value: trigger.key,
      label: trigger.label,
      description: [
        categoryByKey.get(trigger.category),
        trigger.description,
      ]
        .filter(Boolean)
        .join(" · "),
      disabled: trigger.activatable === false,
    }));
  }, [categoriesQuery.data, triggersQuery.data]);

  return (
    <SearchableSelect
      items={items}
      value={value ?? null}
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
      placeholder={placeholder}
      disabled={disabled || triggersQuery.isLoading}
      emptyMessage={
        triggersQuery.isLoading ? "Loading triggers…" : "No matching triggers"
      }
      triggerClassName={cn("w-full font-normal", className)}
    />
  );
}
