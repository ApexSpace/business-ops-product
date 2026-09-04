"use client";

import {
  AMOUNT_UNIT_TOGGLE_CLASS,
  AMOUNT_UNIT_TOGGLE_SEGMENT_ACTIVE_CLASS,
  AMOUNT_UNIT_TOGGLE_SEGMENT_CLASS,
  AMOUNT_UNIT_TOGGLE_SEGMENT_IDLE_CLASS,
} from "@/lib/design/amount-unit-toggle-tokens";
import { cn } from "@/lib/utils";

export type AmountUnitToggleProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  /** Value stored when `$` is selected (e.g. `"FLAT"` or `"FIXED"`). */
  currencyValue: T;
  /** Value stored when `%` is selected (e.g. `"PERCENT"` or `"PERCENTAGE"`). */
  percentValue: T;
  disabled?: boolean;
  currencyDisabled?: boolean;
  percentDisabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

/**
 * Global `$` / `%` unit toggle — Figma settings Toggle (82×44).
 * Use beside amount inputs for commission, deposit, discount, etc.
 */
export function AmountUnitToggle<T extends string>({
  value,
  onValueChange,
  currencyValue,
  percentValue,
  disabled = false,
  currencyDisabled = false,
  percentDisabled = false,
  className,
  "aria-label": ariaLabel = "Amount unit",
}: AmountUnitToggleProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(AMOUNT_UNIT_TOGGLE_CLASS, className)}
    >
      <button
        type="button"
        disabled={disabled || currencyDisabled}
        aria-pressed={value === currencyValue}
        aria-label="Currency"
        className={cn(
          AMOUNT_UNIT_TOGGLE_SEGMENT_CLASS,
          value === currencyValue
            ? AMOUNT_UNIT_TOGGLE_SEGMENT_ACTIVE_CLASS
            : AMOUNT_UNIT_TOGGLE_SEGMENT_IDLE_CLASS,
        )}
        onClick={() => onValueChange(currencyValue)}
      >
        $
      </button>
      <button
        type="button"
        disabled={disabled || percentDisabled}
        aria-pressed={value === percentValue}
        aria-label="Percent"
        className={cn(
          AMOUNT_UNIT_TOGGLE_SEGMENT_CLASS,
          value === percentValue
            ? AMOUNT_UNIT_TOGGLE_SEGMENT_ACTIVE_CLASS
            : AMOUNT_UNIT_TOGGLE_SEGMENT_IDLE_CLASS,
        )}
        onClick={() => onValueChange(percentValue)}
      >
        %
      </button>
    </div>
  );
}
