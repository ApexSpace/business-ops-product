"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DRAWER_CHECKBOX_CLASS,
  DRAWER_CHECKBOX_LABEL_CLASS,
  DRAWER_FORM_FIELDS_CLASS,
} from "@/lib/design/drawer-tokens";
import { cn } from "@/lib/utils";

export interface ListFilterOption {
  value: string | null;
  label: string;
  /** Optional status swatch (Appointments-style colored dot). */
  swatchClassName?: string;
}

export interface ListFilterCheckboxGroupProps {
  legend: string;
  options: ListFilterOption[];
  /** Single-select value. Use with `multiple={false}` (default). */
  value?: string;
  /** Multi-select values. Use with `multiple`. */
  values?: string[];
  multiple?: boolean;
  onChange: (next: string | string[]) => void;
  className?: string;
}

/**
 * Appointments-style filter fieldset for the shared list filter sidebar.
 * Single-select (radio-like checkboxes) or multi-select.
 */
export function ListFilterCheckboxGroup({
  legend,
  options,
  value = "",
  values,
  multiple = false,
  onChange,
  className,
}: ListFilterCheckboxGroupProps) {
  const selected = multiple ? new Set(values ?? []) : null;

  return (
    <div className={cn(DRAWER_FORM_FIELDS_CLASS, className)}>
      <fieldset className="flex w-full min-w-0 flex-col gap-1 border-0 p-0">
        <legend className="mb-2 text-[12px] font-medium leading-none text-[var(--drawer-text-secondary)]">
          {legend}
        </legend>
        {options.map((opt) => {
          const optionValue = opt.value ?? "";
          const id = `list-filter-${legend}-${optionValue || "all"}`.replace(/\s+/g, "-");
          const checked = multiple
            ? selected!.has(optionValue)
            : value === optionValue;
          return (
            <div
              key={optionValue || "all"}
              className="flex min-h-11 w-full min-w-0 items-center gap-3"
            >
              <Checkbox
                id={id}
                checked={checked}
                className={DRAWER_CHECKBOX_CLASS}
                onCheckedChange={(next) => {
                  const isOn = next === true;
                  if (multiple) {
                    const set = new Set(values ?? []);
                    if (isOn) set.add(optionValue);
                    else set.delete(optionValue);
                    onChange(Array.from(set));
                    return;
                  }
                  onChange(
                    isOn
                      ? optionValue
                      : value === optionValue
                        ? ""
                        : optionValue,
                  );
                }}
              />
              {opt.swatchClassName ? (
                <span
                  className={cn("size-2.5 shrink-0 rounded-full", opt.swatchClassName)}
                  aria-hidden
                />
              ) : null}
              <Label
                htmlFor={id}
                className={cn(DRAWER_CHECKBOX_LABEL_CLASS, "cursor-pointer")}
              >
                {opt.label}
              </Label>
            </div>
          );
        })}
      </fieldset>
    </div>
  );
}
