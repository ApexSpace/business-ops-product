"use client";

import { FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 py-8" : "gap-3 py-14",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-muted/50 ring-1 ring-border/60",
          compact ? "size-10" : "size-12",
        )}
      >
        {icon ?? (
          <FileSearch
            className={cn(
              "text-muted-foreground/70",
              compact ? "size-4" : "size-5",
            )}
            aria-hidden
          />
        )}
      </div>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
