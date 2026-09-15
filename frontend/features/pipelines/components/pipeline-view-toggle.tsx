"use client";

import Link from "next/link";
import { LayoutGrid, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PipelineViewToggle({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-[var(--radius-control)] border border-border/70 bg-card p-0.5",
        className,
      )}
      role="group"
      aria-label="Pipeline view"
    >
      <span
        className="inline-flex h-[var(--control-height)] items-center gap-1.5 rounded-[calc(var(--radius-control)-2px)] bg-primary px-3 text-xs font-semibold text-primary-foreground"
        aria-current="page"
      >
        <LayoutGrid className="size-3.5 shrink-0" aria-hidden />
        Kanban
      </span>
      <Link
        href="/business/leads"
        className="inline-flex h-[var(--control-height)] items-center gap-1.5 rounded-[calc(var(--radius-control)-2px)] px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      >
        <Table2 className="size-3.5 shrink-0" aria-hidden />
        Advanced table view
      </Link>
    </div>
  );
}
