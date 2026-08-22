"use client";

import {
  CONTACTS_TIMELINE_CHIP_ACTIVE_CLASS,
  CONTACTS_TIMELINE_CHIP_CLASS,
  CONTACTS_TIMELINE_CHIPS_ROW_CLASS,
} from "@/features/contacts/styles/contacts-drawer-tokens";
import { cn } from "@/lib/utils";

export interface ContactTimelineChipOption {
  value: string;
  label: string;
}

interface ContactTimelineChipFilterProps {
  options: readonly ContactTimelineChipOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  "aria-label"?: string;
}

/**
 * Figma timeline filter chips — 30px hug pills, 8px gap, wrap on narrow widths.
 * Active: solid violet. Inactive: white + soft border.
 */
export function ContactTimelineChipFilter({
  options,
  value,
  onChange,
  className,
  "aria-label": ariaLabel = "Filter timeline",
}: ContactTimelineChipFilterProps) {
  return (
    <div
      className={cn(CONTACTS_TIMELINE_CHIPS_ROW_CLASS, className)}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            className={
              selected
                ? CONTACTS_TIMELINE_CHIP_ACTIVE_CLASS
                : CONTACTS_TIMELINE_CHIP_CLASS
            }
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
