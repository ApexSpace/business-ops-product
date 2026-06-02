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
  density?: DataTableDensity;
  toolbar?: React.ReactNode;
  className?: string;
}

const SKELETON_ROWS = 5;

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
  density = "default",
  toolbar,
  className,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalSelection, setInternalSelection] = useState<RowSelectionState>(
    {},
  );

  const rowSelection = controlledSelection ?? internalSelection;
  const setRowSelection = onRowSelectionChange ?? setInternalSelection;
  const isCompact = density === "compact";

  const tanstackColumns = useMemo<ColumnDef<T>[]>(() => {
    const defs: ColumnDef<T>[] = columns.map((col) => ({
      id: col.id,
      accessorFn: col.sortValue
        ? (row) => col.sortValue!(row)
        : undefined,
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
    table.getVisibleFlatColumns().length || columns.length + (rowActions ? 1 : 0);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg bg-card shadow-elevation-xs ring-1 ring-border/70",
        className,
      )}
      style={
        isCompact
          ? ({ "--table-row-height": "var(--table-row-height-compact)" } as React.CSSProperties)
          : undefined
      }
    >
      {toolbar ? (
        <div className="border-b border-border/80 px-3 py-2.5 sm:px-4">
          {toolbar}
        </div>
      ) : null}
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="h-9 border-b border-border/80 hover:bg-transparent"
            >
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      header.column.id === "actions" && "w-[1%] text-right",
                      (
                        header.column.columnDef.meta as
                          | { className?: string }
                          | undefined
                      )?.className,
                    )}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
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
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                {Array.from({ length: colSpan }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full max-w-[200px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={colSpan} className="p-0">
                <EmptyState
                  title={emptyTitle}
                  description={emptyDescription}
                  action={emptyAction}
                />
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      cell.column.id === "actions" && "text-right",
                      (
                        cell.column.columnDef.meta as
                          | { className?: string }
                          | undefined
                      )?.className,
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
