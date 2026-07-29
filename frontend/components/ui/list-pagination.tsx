"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PaginatedMeta } from "@/lib/types/shared";

interface ListPaginationProps {
  meta: PaginatedMeta;
  page: number;
  onPageChange: (page: number) => void;
  label?: string;
  /** Tighter layout for narrow panels (icon-only controls, smaller summary). */
  compact?: boolean;
}

export function ListPagination({
  meta,
  page,
  onPageChange,
  label = "items",
  compact = false,
}: ListPaginationProps) {
  const hasNext = page * meta.limit < meta.total;
  const summary =
    meta.total > 0
      ? `${meta.total} ${label} · Page ${page}`
      : `${meta.total} ${label}`;

  return (
    <div
      className={cn(
        "flex min-w-0 items-center justify-between gap-2 text-muted-foreground",
        compact ? "text-xs" : "text-sm",
      )}
    >
      <span className="min-w-0 truncate whitespace-nowrap tabular-nums">
        {summary}
      </span>
      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          variant="outline"
          size={compact ? "icon-xs" : "sm"}
          disabled={page <= 1}
          aria-label="Previous page"
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className={compact ? "size-3.5" : "size-4"} />
          {!compact ? "Previous" : null}
        </Button>
        <Button
          type="button"
          variant="outline"
          size={compact ? "icon-xs" : "sm"}
          disabled={!hasNext}
          aria-label="Next page"
          onClick={() => onPageChange(page + 1)}
        >
          {!compact ? "Next" : null}
          <ChevronRight className={compact ? "size-3.5" : "size-4"} />
        </Button>
      </div>
    </div>
  );
}
