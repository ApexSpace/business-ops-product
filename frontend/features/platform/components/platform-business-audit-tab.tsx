"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { SearchInput } from "@/components/forms/search-input";
import { FilterBar } from "@/components/layout/filter-bar";
import { ListPagination } from "@/components/ui/list-pagination";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { listBusinessAuditLogs } from "@/features/platform/api/platform.api";
import type { AuditLog } from "@/features/platform/types";
import { queryKeys } from "@/lib/query/keys";

const PAGE_LIMIT = 20;

export function PlatformBusinessAuditTab({
  businessId,
}: {
  businessId: string;
}) {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const debouncedAction = useDebouncedValue(actionFilter);

  const listFilters = {
    page,
    limit: PAGE_LIMIT,
    action: debouncedAction || undefined,
  };

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: queryKeys.platform.businesses.audit(businessId, listFilters),
    placeholderData: keepPreviousData,
    queryFn: () => listBusinessAuditLogs(businessId, listFilters),
  });

  const columns = useMemo<DataTableColumn<AuditLog>[]>(
    () => [
      {
        id: "action",
        header: "Action",
        sortable: true,
        sortValue: (row) => row.action,
        cell: (row) => (
          <span className="font-mono text-xs">{row.action}</span>
        ),
      },
      {
        id: "actor",
        header: "Actor",
        sortable: true,
        sortValue: (row) => row.actorEmail ?? "",
        cell: (row) => (
          <span className="text-muted-foreground">
            {row.actorEmail ?? "—"}
          </span>
        ),
      },
      {
        id: "entity",
        header: "Entity",
        sortable: true,
        sortValue: (row) => row.entityType,
        cell: (row) => (
          <span>
            {row.entityType}
            {row.entityId ? ` · ${row.entityId.slice(0, 8)}…` : ""}
          </span>
        ),
      },
      {
        id: "time",
        header: "When",
        sortable: true,
        sortValue: (row) => row.createdAt,
        cell: (row) => (
          <span className="whitespace-nowrap">
            {new Date(row.createdAt).toLocaleString()}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <FilterBar>
        <SearchInput
          value={actionFilter}
          onChange={(value) => {
            setActionFilter(value);
            setPage(1);
          }}
          placeholder="Filter by action…"
        />
      </FilterBar>

      <DataTable
        columns={columns}
        data={auditLogs?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No audit logs"
      />

      {auditLogs?.meta ? (
        <ListPagination
          meta={auditLogs.meta}
          page={page}
          onPageChange={setPage}
          label="entries"
        />
      ) : null}
    </div>
  );
}
