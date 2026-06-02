"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { formatBoardColumnTotal, pluralizeCount } from "@/components/board/board-utils";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

export interface BoardColumnHeaderProps {
  title: string;
  count: number;
  countSingular: string;
  countPlural?: string;
  totalValue: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export function BoardColumnHeader({
  title,
  count,
  countSingular,
  countPlural,
  totalValue,
  collapsed,
  onToggleCollapse,
  className,
}: BoardColumnHeaderProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 rounded-xl border border-border/80 bg-card p-3 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-foreground">
            {title}
          </h2>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span>{pluralizeCount(count, countSingular, countPlural)}</span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatBoardColumnTotal(totalValue)}
            </span>
          </div>
        </div>
        {onToggleCollapse ? (
          <IconButton
            type="button"
            aria-label={collapsed ? "Expand column" : "Collapse column"}
            className="size-7 shrink-0 text-muted-foreground"
            onClick={onToggleCollapse}
          >
            {collapsed ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronUp className="size-4" />
            )}
          </IconButton>
        ) : null}
      </div>
    </div>
  );
}
