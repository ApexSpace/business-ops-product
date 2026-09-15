"use client";

import { cn } from "@/lib/utils";

interface EntityDetailToolbarProps {
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  /** stacked = filters on top, actions below (best for narrow drawers) */
  layout?: "inline" | "stacked";
}

export function EntityDetailToolbar({
  filters,
  actions,
  className,
  layout = "stacked",
}: EntityDetailToolbarProps) {
  if (!filters && !actions) {
    return null;
  }

  if (layout === "inline") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3",
          className,
        )}
      >
        {filters ? (
          <div className="min-w-0 flex-1">{filters}</div>
        ) : (
          <div className="flex-1" />
        )}
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-3 border-b border-border/60 pb-4",
        className,
      )}
    >
      {filters ? <div className="min-w-0">{filters}</div> : null}
      {actions ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
