"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { type DataTableColumn } from "@/components/data-display/data-table";
import { EntityListLayout } from "@/components/layout/entity-list-layout";
import { ListPageSkeleton } from "@/components/layout/list-page";
import { ListPagination } from "@/components/ui/list-pagination";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";
import { listPlatformAuditLogs } from "@/features/platform/api/platform.api";
import { queryKeys } from "@/lib/query/keys";
import type { AuditLog } from "@/features/platform/types";

const LIST_SCHEMA = {
  page: { default: "1" },
  action: { default: "" },
} as const;

const PAGE_LIMIT = 30;

function PlatformAuditLogsPageContent() {
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const debouncedAction = useDebouncedValue(params.action);

  const listFilters = {
    page,
    limit: PAGE_LIMIT,
    search: debouncedAction || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.platform.auditLogs.list(listFilters),
    placeholderData: keepPreviousData,
    queryFn: () =>
      listPlatformAuditLogs({
        page,
        limit: PAGE_LIMIT,
        search: debouncedAction || undefined,
      }),
  });

  const columns = useMemo<DataTableColumn<AuditLog>[]>(
    () => [
      {
        id: "time",
        header: "Time",
        sortable: true,
        sortValue: (row) => row.createdAt,
        cell: (row) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {new Date(row.createdAt).toLocaleString()}
          </span>
        ),
      },
      {
        id: "action",
        header: "Action",
        sortable: true,
        sortValue: (row) => row.action,
        cell: (row) => (
          <span className="font-mono text-sm">{row.action}</span>
        ),
      },
      {
        id: "entity",
        header: "Entity",
        cell: (row) => (
          <span className="text-muted-foreground">
            {row.entityType}
            {row.entityId ? ` · ${row.entityId.slice(0, 8)}…` : ""}
          </span>
        ),
      },
      {
        id: "business",
        header: "Business",
        cell: (row) =>
          row.businessId ? (
            <Link
              href={`/platform/businesses/${row.businessId}`}
              className="hover:underline"
            >
              View business
            </Link>
          ) : (
            <span className="text-muted-foreground">Platform</span>
          ),
      },
    ],
    [],
  );

  return (
    <EntityListLayout
      title="Audit Logs"
      description="Platform-wide activity across all businesses."
      searchPlaceholder="Filter by action…"
      searchValue={params.action}
      onSearchChange={(value) =>
        setParams({ action: value, page: "1" }, { resetPage: true })
      }
      footer={
        data?.meta ? (
          <ListPagination
            meta={data.meta}
            page={page}
            onPageChange={(p) => setParams({ page: String(p) })}
            label="logs"
          />
        ) : undefined
      }
      columns={columns}
      data={data?.items ?? []}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      emptyTitle="No audit logs found"
    />
  );
}

export default function PlatformAuditLogsPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <PlatformAuditLogsPageContent />
    </Suspense>
  );
}
