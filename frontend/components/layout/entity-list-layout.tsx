"use client";

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
 * Shared list-page chrome: optional Add + Search + Filter, then DataTable.
 * Vertical gap above/below the toolbar is `--cs-list-toolbar-gap` (via
 * EntityWorkspaceLayout / workspace tokens) so every consumer matches.
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
  extraActions,
  extraFilters,
  columns,
  data,
  getRowId,
  isLoading,
  density = "default",
  tableClassName,
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
  const addVisible = Boolean(onAdd) && showAddButton !== false;
  const searchVisible = Boolean(onSearchChange) && showSearch !== false;
  const filterVisible = Boolean(onFilterClick) && showFilter !== false;

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
        {filterVisible ? (
          <ListFilterButton
            aria-label={filterAriaLabel}
            active={filterActive}
            onClick={onFilterClick}
          />
        ) : null}
        {extraFilters}
      </>
    ) : null;

  return (
    <EntityWorkspaceLayout
      title={title}
      description={description}
      hideHeader={hideHeader}
      className={className}
      dense={dense}
      fullHeight={fullHeight}
      footer={footer}
      drawer={drawer}
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
  );
}
