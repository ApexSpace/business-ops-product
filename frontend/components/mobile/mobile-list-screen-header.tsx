"use client";

import { Plus } from "lucide-react";
import { ListFilterButton } from "@/components/layout/list-filter-button";
import { MOBILE_LIST_HEADER_BG } from "@/lib/design/mobile-list-tokens";
import { cn } from "@/lib/utils";

export interface MobileListScreenHeaderProps {
  title: string;
  onFilter?: () => void;
  onCreate?: () => void;
  canCreate?: boolean;
  filterLabel?: string;
  createLabel?: string;
  className?: string;
  /** Hide filter when the screen has no options drawer */
  showFilter?: boolean;
}

/**
 * Figma purple mobile list app bar — filter · title · +.
 * Same chrome as appointments calendar mobile header.
 */
export function MobileListScreenHeader({
  title,
  onFilter,
  onCreate,
  canCreate = true,
  filterLabel = "Options",
  createLabel = "Create",
  className,
  showFilter = true,
}: MobileListScreenHeaderProps) {
  return (
    <header
      className={cn(
        MOBILE_LIST_HEADER_BG,
        "flex h-12 shrink-0 items-center justify-between gap-2 px-2 text-white",
        "pt-[max(0px,env(safe-area-inset-top))]",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center justify-start">
        {showFilter && onFilter ? (
          <ListFilterButton
            aria-label={filterLabel}
            onClick={onFilter}
            className="!size-10 !min-h-10 !min-w-10 !w-10 !rounded-md text-white hover:!bg-white/15 hover:!text-white"
            iconClassName="!text-white"
          />
        ) : (
          <span className="size-10" aria-hidden />
        )}
      </div>

      <h1 className="truncate text-[17px] font-semibold leading-none text-white">
        {title}
      </h1>

      <div className="flex min-w-0 flex-1 items-center justify-end">
        {onCreate ? (
          <button
            type="button"
            aria-label={createLabel}
            disabled={!canCreate}
            onClick={onCreate}
            className="inline-flex size-10 items-center justify-center rounded-md text-white hover:bg-white/15 disabled:pointer-events-none disabled:opacity-40"
          >
            <Plus className="size-6" strokeWidth={2} aria-hidden />
          </button>
        ) : (
          <span className="size-10" aria-hidden />
        )}
      </div>
    </header>
  );
}
