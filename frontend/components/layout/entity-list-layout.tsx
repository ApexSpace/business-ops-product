"use client";

import { useState } from "react";
import {
  DataTable,
  type DataTableColumn,
  type DataTableDensity,
  type DataTableProps,
} from "@/components/data-display/data-table";
import { SearchInput } from "@/components/forms/search-input";
import { EntityWorkspaceLayout } from "@/components/layout/entity-workspace-layout";
import { ListFilterButton } from "@/components/layout/list-filter-button";
import { ListPrimaryAction } from "@/components/layout/list-primary-action";
import { OptionsFilterDrawer } from "@/components/layout/options-filter-drawer";
import { WORKSPACE_TABLE_CLASS } from "@/lib/design/workspace-tokens";
import type { RowSelectionState } from "@tanstack/react-table";

type EntityListTableProps<T> = Pick<
  DataTableProps<T>,
  | "enableRowSelection"
  | "rowSelection"
  | "onRowSelectionChange"
  | "rowActions"
  | "actionsColumnHeader"
  | "activeRowId"
  | "onRowClick"
  | "getRowClassName"
  | "emptyTitle"
  | "emptyDescription"
  | "emptyAction"
>;

export interface EntityListLayoutProps<T> extends EntityListTableProps<T> {
  title: string;
  description?: string;
  hideHeader?: boolean;
  className?: string;
  dense?: boolean;
  fullHeight?: boolean;
  footer?: React.ReactNode;
  drawer?: React.ReactNode;
  /** Optional chrome above the toolbar (back links). */
  leading?: React.ReactNode;
  /** Replaces the table (errors, custom empty, etc.). */
  error?: React.ReactNode;

  showAddButton?: boolean;
  addButtonLabel?: string;
  onAdd?: () => void;
  addDisabled?: boolean;

  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;

  showFilter?: boolean;
  onFilterClick?: () => void;
  filterActive?: boolean;
  filterAriaLabel?: string;
  /**
   * Body of the shared Appointments-style filter sidebar.
   * When set (and `onFilterClick` is not), the filter icon opens OptionsFilterDrawer.
   */
  filterContent?: React.ReactNode;
  onFilterApply?: () => void;
  filterTitle?: string;
  filterSpineLabel?: string;
  filterApplyLabel?: string;
  filterApplyDisabled?: boolean;
  filterOpen?: boolean;
  onFilterOpenChange?: (open: boolean) => void;

  /** Skip list-page inset (nested tabs already inside a padded workspace). */
  flush?: boolean;
  extraActions?: React.ReactNode;
  extraFilters?: React.ReactNode;

  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  isLoading?: boolean;
  density?: DataTableDensity;
  tableClassName?: string;
}

/**
 * Shared DataTable list-page chrome.
 * Toolbar (primary action left, search + filter right) + DataTable.
 * Vertical gap navbar → toolbar → table is `--cs-list-toolbar-gap`.
 * Horizontal: full content width (`px-0`) on every list page.
 */
export function EntityListLayout<T>({
  title,
  description,
  hideHeader,
  className,
  dense,
  fullHeight,
  footer,
  drawer,
  leading,
  error,
  showAddButton,
  addButtonLabel = "New",
  onAdd,
  addDisabled,
  showSearch,
  searchPlaceholder = "Search",
  searchValue = "",
  onSearchChange,
  showFilter,
  onFilterClick,
  filterActive,
  filterAriaLabel = "Filters",
  filterContent,
  onFilterApply,
  filterTitle = "Filters",
  filterSpineLabel = "FILTERS",
  filterApplyLabel = "Apply",
  filterApplyDisabled,
  filterOpen: filterOpenProp,
  onFilterOpenChange,
  extraActions,
  extraFilters,
  columns,
  data,
  getRowId,
  isLoading,
  density = "default",
  tableClassName,
  flush,
  enableRowSelection,
  rowSelection,
  onRowSelectionChange,
  rowActions,
  actionsColumnHeader,
  activeRowId,
  onRowClick,
  getRowClassName,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: EntityListLayoutProps<T>) {
  const [internalFilterOpen, setInternalFilterOpen] = useState(false);
  const usesBuiltInFilter = Boolean(filterContent) && !onFilterClick;
  const filterOpen = filterOpenProp ?? internalFilterOpen;
  const setFilterOpen = onFilterOpenChange ?? setInternalFilterOpen;

  const addVisible = Boolean(onAdd) && showAddButton !== false;
  const searchVisible = Boolean(onSearchChange) && showSearch !== false;
  const filterVisible =
    showFilter !== false &&
    (usesBuiltInFilter || Boolean(onFilterClick) || Boolean(extraFilters));

  const actions =
    addVisible || extraActions ? (
      <>
        {addVisible ? (
          <ListPrimaryAction
            label={addButtonLabel}
            onClick={onAdd!}
            disabled={addDisabled}
          />
        ) : null}
        {extraActions}
      </>
    ) : null;

  const search = searchVisible ? (
    <SearchInput
      value={searchValue}
      onChange={onSearchChange!}
      placeholder={searchPlaceholder}
      className="min-w-0 flex-1"
    />
  ) : null;

  const filters =
    filterVisible || extraFilters ? (
      <>
        {filterVisible && (usesBuiltInFilter || onFilterClick) ? (
          <ListFilterButton
            aria-label={filterAriaLabel}
            active={filterActive}
            onClick={() => {
              if (onFilterClick) {
                onFilterClick();
                return;
              }
              setFilterOpen(true);
            }}
          />
        ) : null}
        {extraFilters}
      </>
    ) : null;

  return (
    <>
      <EntityWorkspaceLayout
        title={title}
        description={description}
        hideHeader={hideHeader}
        className={className}
        dense={dense}
        fullHeight={fullHeight}
        footer={footer}
        drawer={drawer}
        leading={leading}
        flush={flush}
        actions={actions}
        search={search}
        filters={filters}
      >
        {error ?? (
          <DataTable
            columns={columns}
            data={data}
            getRowId={getRowId}
            isLoading={isLoading}
            density={density}
            enableRowSelection={enableRowSelection}
            rowSelection={rowSelection as RowSelectionState | undefined}
            onRowSelectionChange={onRowSelectionChange}
            rowActions={rowActions}
            actionsColumnHeader={actionsColumnHeader}
            activeRowId={activeRowId}
            onRowClick={onRowClick}
            getRowClassName={getRowClassName}
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
            emptyAction={emptyAction}
            className={tableClassName ?? WORKSPACE_TABLE_CLASS}
          />
        )}
      </EntityWorkspaceLayout>
      {usesBuiltInFilter ? (
        <OptionsFilterDrawer
          open={filterOpen}
          onOpenChange={setFilterOpen}
          title={filterTitle}
          spineLabel={filterSpineLabel}
          applyLabel={filterApplyLabel}
          applyDisabled={filterApplyDisabled}
          onApply={() => onFilterApply?.()}
        >
          {filterContent}
        </OptionsFilterDrawer>
      ) : null}
    </>
  );
}
