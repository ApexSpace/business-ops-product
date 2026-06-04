"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PaginatedMeta } from "@/lib/types/shared";

interface ListPaginationProps {
  meta: PaginatedMeta;
  page: number;
  onPageChange: (page: number) => void;
  label?: string;
}

export function ListPagination({
  meta,
  page,
  onPageChange,
  label = "items",
}: ListPaginationProps) {
  const hasNext = page * meta.limit < meta.total;

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        {meta.total} {label}
        {meta.total > 0 ? ` · page ${page}` : ""}
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          aria-label="Previous page"
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasNext}
          aria-label="Next page"
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
