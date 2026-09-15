"use client";

import { cn } from "@/lib/utils";

export interface EntityDetailLinkFilterOption {
  value: string;
  label: string;
}

interface EntityDetailLinkFilterProps {
  options: EntityDetailLinkFilterOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

/** Horizontal text-link filters with dividers — for in-tab filtering (not navigation). */
export function EntityDetailLinkFilter({
  options,
  value,
  onChange,
  label = "Filter by",
  className,
}: EntityDetailLinkFilterProps) {
  return (
    <div
      className={cn("min-w-0", className)}
      role="group"
      aria-label={label}
    >
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
        <span className="mr-1 shrink-0 text-muted-foreground">{label}</span>
        {options.map((option, index) => {
          const active = option.value === value;
          return (
            <span key={option.value} className="inline-flex items-center">
              {index > 0 ? (
                <span
                  className="mx-1.5 text-border select-none"
                  aria-hidden
                >
                  |
                </span>
              ) : null}
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onChange(option.value)}
                className={cn(
                  "shrink-0 rounded-sm px-0.5 py-0.5 transition-colors",
                  active
                    ? "font-medium text-foreground underline decoration-primary decoration-2 underline-offset-4"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
