"use client";

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
  className?: string;
}

export function EntityDetailSegmentedFilter({
  options,
  value,
  onChange,
  label = "Filter by",
  className,
}: EntityDetailSegmentedFilterProps) {
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
