"use client";

import {
  ENTITY_FILTER_PILL_ACTIVE_CLASS,
  ENTITY_FILTER_PILL_CLASS,
  ENTITY_FILTER_PILL_ROW_CLASS,
} from "@/lib/design/workspace-tokens";
import { cn } from "@/lib/utils";

export interface EntityDetailSegmentOption {
  value: string;
  label: string;
}

interface EntityDetailSegmentedFilterProps {
  options: EntityDetailSegmentOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  /**
   * `default` — connected muted track.
   * `pills` — discrete Figma filter chips (30px, radius/sm).
   */
  variant?: "default" | "pills";
  className?: string;
}

export function EntityDetailSegmentedFilter({
  options,
  value,
  onChange,
  label = "Filter by",
  variant = "default",
  className,
}: EntityDetailSegmentedFilterProps) {
  if (variant === "pills") {
    return (
      <div
        className={cn(ENTITY_FILTER_PILL_ROW_CLASS, className)}
        role="group"
        aria-label={label}
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={
                active
                  ? ENTITY_FILTER_PILL_ACTIVE_CLASS
                  : ENTITY_FILTER_PILL_CLASS
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn("flex min-w-0 flex-wrap items-center gap-2", className)}
      role="group"
      aria-label={label}
    >
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="inline-flex min-w-0 flex-wrap items-center rounded-lg border border-border bg-muted/40 p-0.5">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                "min-h-[2rem] min-w-[2rem]",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
