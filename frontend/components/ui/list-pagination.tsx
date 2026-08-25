"use client";

import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
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
   * `numbered` — Figma Contacts/Sales pagination (Previous · pages · Next).
   * `simple` — compact prev/next for narrow panels.
   */
  variant?: "numbered" | "simple";
  /** @deprecated Prefer `variant="simple"` */
  compact?: boolean;
  className?: string;
}

/** Figma pattern: 1 2 3 … 67 68 with a small window around the current page. */
function buildPageItems(
  current: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages]);
  for (let p = current - 1; p <= current + 1; p += 1) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
  }
  if (current >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const pageNum = sorted[i]!;
    if (i > 0) {
      const prev = sorted[i - 1]!;
      if (pageNum - prev > 1) items.push("ellipsis");
    }
    items.push(pageNum);
  }
  return items;
}

/**
 * Universal list pagination — Figma numbered control by default.
 * Reuse on Contacts, Sales, Products, Payments, and other entity lists.
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
            <NavArrowIcon direction="left" size="sm" />
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
            <NavArrowIcon direction="right" size="sm" />
          </button>
        </div>
      </div>
    );
  }

  if (totalPages <= 1) {
    return null;
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
        <NavArrowIcon direction="left" size="sm" />
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
        <NavArrowIcon direction="right" size="sm" />
      </button>
    </nav>
  );
}
