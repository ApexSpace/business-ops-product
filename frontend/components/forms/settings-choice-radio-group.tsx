"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SETTINGS_FORM_DESCRIPTION_CLASS } from "@/lib/design/settings-form-tokens";
import { cn } from "@/lib/utils";

export type SettingsChoiceOption = {
  value: string;
  label: string;
  description?: string;
  /** Rendered under the option when it is selected. */
  children?: ReactNode;
};

export type SettingsChoiceRadioGroupProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SettingsChoiceOption[];
  name?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

/**
 * Shared settings choice list: radio + bold label + muted helper,
 * with optional nested content when an option is selected.
 * Used by Resources (capacity / schedule) and reusable elsewhere.
 */
export function SettingsChoiceRadioGroup({
  value,
  onValueChange,
  options,
  name,
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: SettingsChoiceRadioGroupProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      name={name}
      aria-label={ariaLabel}
      className={cn("grid w-full gap-[var(--spacing-4)]", className)}
    >
      {options.map((option) => {
        const id = name
          ? `${name}-${option.value}`
          : `choice-${option.value}`;
        const selected = value === option.value;
        return (
          <div key={option.value} className="min-w-0 space-y-[var(--spacing-3)]">
            <div className="flex items-start gap-[var(--spacing-3)]">
              <RadioGroupItem
                id={id}
                value={option.value}
                className="mt-0.5"
                disabled={disabled}
              />
              <div className="min-w-0 space-y-[var(--spacing-1)]">
                <Label
                  htmlFor={id}
                  className="cursor-pointer text-sm font-medium text-foreground"
                >
                  {option.label}
                </Label>
                {option.description ? (
                  <p className={cn(SETTINGS_FORM_DESCRIPTION_CLASS, "text-xs")}>
                    {option.description}
                  </p>
                ) : null}
              </div>
            </div>
            {selected && option.children ? (
              <div className="min-w-0 pl-7">{option.children}</div>
            ) : null}
          </div>
        );
      })}
    </RadioGroup>
  );
}
