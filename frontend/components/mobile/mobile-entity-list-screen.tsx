"use client";

import { SearchInput } from "@/components/forms/search-input";
import { MobileListScreenHeader } from "@/components/mobile/mobile-list-screen-header";
import { LoadingState } from "@/components/data-display/loading-state";
import { ListPagination } from "@/components/ui/list-pagination";
import { MOBILE_LIST_SEARCH_WRAP_CLASS } from "@/lib/design/mobile-list-tokens";
import { cn } from "@/lib/utils";

export interface MobileEntityListScreenProps {
  title: string;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  onFilter?: () => void;
  filterLabel?: string;
  onCreate?: () => void;
  createLabel?: string;
  canCreate?: boolean;
  showFilter?: boolean;
  /** Hide the search field when the desktop list has no search. Default true. */
  showSearch?: boolean;
  isLoading?: boolean;
  isEmpty?: boolean;
  loadingMessage?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  pagination?: {
    meta: { total: number; page: number; limit: number };
    page: number;
    onPageChange: (page: number) => void;
    label?: string;
  };
  /** Optional bottom nav (e.g. MobileAppBottomNav). */
  bottomNav?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Shared mobile entity list screen:
 * purple header → search → scroll list / empty / loading → pagination → optional nav.
 */
export function MobileEntityListScreen({
  title,
  search,
  onSearchChange,
  searchPlaceholder = "Search",
  onFilter,
  filterLabel,
  onCreate,
  createLabel,
  canCreate = true,
  showFilter = true,
  showSearch = true,
  isLoading = false,
  isEmpty = false,
  loadingMessage = "Loading…",
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyAction,
  pagination,
  bottomNav,
  children,
  className,
}: MobileEntityListScreenProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-1 flex-col bg-white",
        className,
      )}
    >
      <MobileListScreenHeader
        title={title}
        onFilter={onFilter}
        filterLabel={filterLabel}
        onCreate={onCreate}
        createLabel={createLabel}
        canCreate={canCreate}
        showFilter={showFilter}
      />

      {showSearch ? (
        <div className={MOBILE_LIST_SEARCH_WRAP_CLASS}>
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            className="max-w-none"
          />
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {isLoading && isEmpty ? (
          <LoadingState
            variant="inline"
            label={loadingMessage}
            className="w-full justify-center px-4 py-8"
          />
        ) : isEmpty ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <p className="text-[15px] font-semibold text-[var(--drawer-text-primary)]">
              {emptyTitle}
            </p>
            {emptyDescription ? (
              <p className="text-sm text-muted-foreground">{emptyDescription}</p>
            ) : null}
            {emptyAction}
          </div>
        ) : (
          children
        )}
      </div>

      {pagination ? (
        <div className="shrink-0 border-t border-[var(--mobile-list-border)] bg-white px-4 py-3">
          <ListPagination
            meta={pagination.meta}
            page={pagination.page}
            onPageChange={pagination.onPageChange}
            label={pagination.label}
          />
        </div>
      ) : null}

      {bottomNav}
    </div>
  );
}
