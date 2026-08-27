"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  DATA_TABLE_CHROME_COLUMN_CLASS,
  DATA_TABLE_COLUMN_CLASS,
  DATA_TABLE_COLUMN_INNER_CLASS,
  DATA_TABLE_EMPTY_FILL_CLASS,
  DATA_TABLE_GRID_CLASS,
  DATA_TABLE_HEADER_CLASS,
  DATA_TABLE_HEADER_ROW_CLASS,
  DATA_TABLE_SCROLL_CLASS,
  DATA_TABLE_SHELL_CLASS,
  DATA_TABLE_SPACER_CELL_CLASS,
} from "@/lib/design/data-table-tokens";
import { DataTableColumnHeader } from "@/components/data-display/data-table-column-header";
import { EmptyState } from "@/components/data-display/empty-state";

export type DataTableDensity = "default" | "compact";

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  enableRowSelection?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  rowActions?: (row: T) => React.ReactNode;
  actionsColumnHeader?: string;
  /** Kept for API compatibility. All tables use `--table-row-height`. */
  density?: DataTableDensity;
  toolbar?: React.ReactNode;
  className?: string;
  activeRowId?: string | null;
  onRowClick?: (row: T) => void;
  getRowClassName?: (row: T) => string | undefined;
}

const SKELETON_ROWS = 5;

function isChromeColumn(columnId: string) {
  return columnId === "select" || columnId === "actions";
}

function dataTableColumnClass(columnId: string) {
  return cn(
    DATA_TABLE_COLUMN_CLASS,
    isChromeColumn(columnId) && DATA_TABLE_CHROME_COLUMN_CLASS,
    columnId === "actions" && "text-right",
  );
}

function DataTableColumnInner({
  columnId,
  children,
}: {
  columnId?: string;
  children: React.ReactNode;
}) {
  if (columnId && isChromeColumn(columnId)) {
    return children;
  }
  return <div className={DATA_TABLE_COLUMN_INNER_CLASS}>{children}</div>;
}

function DataTableSpacerHead() {
  return <TableHead aria-hidden className={DATA_TABLE_SPACER_CELL_CLASS} />;
}

function DataTableSpacerCell() {
  return <TableCell aria-hidden className={DATA_TABLE_SPACER_CELL_CLASS} />;
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  isLoading = false,
  emptyTitle = "No results",
  emptyDescription,
  emptyAction,
  enableRowSelection = false,
  rowSelection: controlledSelection,
  onRowSelectionChange,
  rowActions,
  actionsColumnHeader = "",
  toolbar,
  className,
  activeRowId,
  onRowClick,
  getRowClassName,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalSelection, setInternalSelection] = useState<RowSelectionState>(
    {},
  );

  const rowSelection = controlledSelection ?? internalSelection;
  const setRowSelection = onRowSelectionChange ?? setInternalSelection;

  const tanstackColumns = useMemo<ColumnDef<T>[]>(() => {
    const defs: ColumnDef<T>[] = columns.map((col) => ({
      id: col.id,
      accessorFn: col.sortValue ? (row) => col.sortValue!(row) : undefined,
      header: col.header,
      cell: ({ row }) => col.cell(row.original),
      enableSorting: col.sortable ?? false,
      meta: { className: col.className },
    }));

    if (enableRowSelection) {
      defs.unshift({
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={() => table.toggleAllPageRowsSelected()}
            aria-label="Select all rows"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
      });
    }

    if (rowActions) {
      defs.push({
        id: "actions",
        header: actionsColumnHeader,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-0.5">
            {rowActions(row.original)}
          </div>
        ),
        enableSorting: false,
      });
    }

    return defs;
  }, [columns, enableRowSelection, rowActions, actionsColumnHeader]);

  const table = useReactTable({
    data,
    columns: tanstackColumns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => getRowId(row),
    enableRowSelection,
  });

  const colSpan =
    table.getVisibleFlatColumns().length ||
    columns.length + (rowActions ? 1 : 0);
  const hasRows = table.getRowModel().rows.length > 0;
  const showGrid = isLoading || hasRows;

  return (
    <div className={cn(DATA_TABLE_SHELL_CLASS, className)}>
      {toolbar ? (
        <div className="shrink-0 border-b border-[#F3F0F9] px-4 py-3">
          {toolbar}
        </div>
      ) : null}
      <div className={DATA_TABLE_SCROLL_CLASS}>
        {showGrid ? (
          <Table
            className={DATA_TABLE_GRID_CLASS}
            containerClassName={cn("overflow-visible", DATA_TABLE_GRID_CLASS)}
          >
            <colgroup>
              {table.getVisibleLeafColumns().map((column) => (
                <col
                  key={column.id}
                  className={
                    isChromeColumn(column.id)
                      ? DATA_TABLE_CHROME_COLUMN_CLASS
                      : DATA_TABLE_COLUMN_CLASS
                  }
                />
              ))}
              <col className="w-full" />
            </colgroup>
            <TableHeader className={DATA_TABLE_HEADER_CLASS}>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className={DATA_TABLE_HEADER_ROW_CLASS}
                >
                  {headerGroup.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    return (
                      <TableHead
                        key={header.id}
                        className={cn(
                          dataTableColumnClass(header.column.id),
                          (
                            header.column.columnDef.meta as
                              { className?: string } | undefined
                          )?.className,
                        )}
                      >
                        {header.isPlaceholder ? null : (
                          <DataTableColumnInner columnId={header.column.id}>
                            {header.column.getCanSort() ? (
                              <DataTableColumnHeader
                                title={String(header.column.columnDef.header)}
                                sorted={sorted || false}
                                onSort={header.column.getToggleSortingHandler()}
                              />
                            ) : (
                              flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )
                            )}
                          </DataTableColumnInner>
                        )}
                      </TableHead>
                    );
                  })}
                  <DataTableSpacerHead />
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      {Array.from({ length: colSpan }).map((__, j) => (
                        <TableCell
                          key={j}
                          className={DATA_TABLE_COLUMN_CLASS}
                        >
                          <DataTableColumnInner>
                            <Skeleton className="h-4 w-full max-w-[200px]" />
                          </DataTableColumnInner>
                        </TableCell>
                      ))}
                      <DataTableSpacerCell />
                    </TableRow>
                  ))
                : table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={
                        row.getIsSelected() || activeRowId === row.id
                          ? "selected"
                          : undefined
                      }
                      tabIndex={onRowClick ? 0 : undefined}
                      role={onRowClick ? "button" : undefined}
                      className={cn(
                        onRowClick &&
                          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7E3BED]/40 focus-visible:ring-inset",
                        getRowClassName?.(row.original),
                      )}
                      onClick={(event) => {
                        if (!onRowClick) return;
                        const target = event.target as HTMLElement;
                        if (
                          target.closest(
                            "a,button,input,textarea,select,label,[role='checkbox'],[data-row-click-ignore='true']",
                          )
                        ) {
                          return;
                        }
                        onRowClick(row.original);
                      }}
                      onKeyDown={(event) => {
                        if (!onRowClick) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRowClick(row.original);
                        }
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            dataTableColumnClass(cell.column.id),
                            (
                              cell.column.columnDef.meta as
                                { className?: string } | undefined
                            )?.className,
                          )}
                        >
                          <DataTableColumnInner columnId={cell.column.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </DataTableColumnInner>
                        </TableCell>
                      ))}
                      <DataTableSpacerCell />
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        ) : (
          <div className={DATA_TABLE_EMPTY_FILL_CLASS}>
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
              action={emptyAction}
            />
          </div>
        )}
      </div>
    </div>
  );
}
