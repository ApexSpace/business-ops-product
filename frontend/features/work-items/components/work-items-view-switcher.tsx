"use client";

import { LayoutGrid, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkItemsView = "board" | "table";

interface WorkItemsViewSwitcherProps {
  value: WorkItemsView;
  onChange: (view: WorkItemsView) => void;
  className?: string;
}

export function WorkItemsViewSwitcher({
  value,
  onChange,
  className,
}: WorkItemsViewSwitcherProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-[var(--radius-control)] border border-border/70 bg-card p-0.5",
        className,
      )}
      role="group"
      aria-label="Work items view"
    >
      <button
        type="button"
        aria-current={value === "board" ? "page" : undefined}
        onClick={() => onChange("board")}
        className={cn(
          "inline-flex h-[var(--control-height)] items-center gap-1.5 rounded-[calc(var(--radius-control)-2px)] px-2.5 text-xs font-semibold transition-colors sm:px-3",
          value === "board"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        <LayoutGrid className="size-3.5 shrink-0" aria-hidden />
        Board
      </button>
      <button
        type="button"
        aria-current={value === "table" ? "page" : undefined}
        onClick={() => onChange("table")}
        className={cn(
          "inline-flex h-[var(--control-height)] items-center gap-1.5 rounded-[calc(var(--radius-control)-2px)] px-2.5 text-xs font-semibold transition-colors sm:px-3",
          value === "table"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        <Table2 className="size-3.5 shrink-0" aria-hidden />
        Table
      </button>
    </div>
  );
}
