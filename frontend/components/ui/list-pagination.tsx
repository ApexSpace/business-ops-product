"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaginatedMeta } from "@/lib/types/shared";
import {
  DATA_TABLE_PAGINATION_BTN_CLASS,
  DATA_TABLE_PAGINATION_CLASS,
  DATA_TABLE_PAGINATION_PAGE_ACTIVE_CLASS,
  DATA_TABLE_PAGINATION_PAGE_CLASS,
} from "@/lib/design/data-table-tokens";

interface ListPaginationProps {
  meta: PaginatedMeta;
  page: number;
  onPageChange: (page: number) => void;
  label?: string;
  /**
   * `numbered` — Figma Sales pagination (Previous · pages · Next).
   * `simple` — compact prev/next for narrow panels.
   */
  variant?: "numbered" | "simple";
  /** @deprecated Prefer `variant="simple"` */
  compact?: boolean;
  className?: string;
}

function buildPageItems(current: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const items: Array<number | "ellipsis"> = [1];
  const windowStart = Math.max(2, current - 1);
  const windowEnd = Math.min(totalPages - 1, current + 1);

  if (windowStart > 2) items.push("ellipsis");
  for (let p = windowStart; p <= windowEnd; p += 1) {
    items.push(p);
  }
  if (windowEnd < totalPages - 1) items.push("ellipsis");
  items.push(totalPages);
  return items;
}

/**
 * Universal list pagination — Figma Sales numbered control by default.
 * Reusable across Sales, Contacts, Products, and other entity lists.
 */
export function ListPagination({
  meta,
  page,
  onPageChange,
  label = "items",
  variant,
  compact = false,
  className,
}: ListPaginationProps) {
  const resolvedVariant = variant ?? (compact ? "simple" : "numbered");
  const totalPages =
    meta.totalPages ??
    Math.max(1, Math.ceil(meta.total / Math.max(1, meta.limit)));
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  if (resolvedVariant === "simple") {
    const summary =
      meta.total > 0
        ? `${meta.total} ${label} · Page ${page}`
        : `${meta.total} ${label}`;

    return (
      <div
        className={cn(
          "flex min-w-0 items-center justify-between gap-2 text-sm text-muted-foreground",
          className,
        )}
      >
        <span className="min-w-0 truncate whitespace-nowrap tabular-nums">
          {summary}
        </span>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            className={DATA_TABLE_PAGINATION_BTN_CLASS}
            disabled={!hasPrev}
            aria-label="Previous page"
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="size-4" />
            Previous
          </button>
          <button
            type="button"
            className={DATA_TABLE_PAGINATION_BTN_CLASS}
            disabled={!hasNext}
            aria-label="Next page"
            onClick={() => onPageChange(page + 1)}
          >
            Next
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  const pages = buildPageItems(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className={cn(DATA_TABLE_PAGINATION_CLASS, className)}
    >
      <button
        type="button"
        className={DATA_TABLE_PAGINATION_BTN_CLASS}
        disabled={!hasPrev}
        aria-label="Previous page"
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="size-4" />
        Previous
      </button>

      {pages.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="inline-flex size-8 items-center justify-center text-[14px] text-[#8A8A8A]"
            aria-hidden
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-label={`Page ${item}`}
            aria-current={item === page ? "page" : undefined}
            className={
              item === page
                ? DATA_TABLE_PAGINATION_PAGE_ACTIVE_CLASS
                : DATA_TABLE_PAGINATION_PAGE_CLASS
            }
            onClick={() => onPageChange(item)}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        className={DATA_TABLE_PAGINATION_BTN_CLASS}
        disabled={!hasNext}
        aria-label="Next page"
        onClick={() => onPageChange(page + 1)}
      >
        Next
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}
