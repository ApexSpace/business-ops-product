"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreateSnapshotWizard } from "@/features/platform/components/create-snapshot-wizard";
import { CloneSnapshotDialog } from "@/features/platform/components/clone-snapshot-dialog";
import { ApplySnapshotDialog } from "@/features/platform/components/apply-snapshot-dialog";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import {
  DataTableRowActions,
  type RowAction,
} from "@/components/data-display/data-table-row-actions";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { FilterBar } from "@/components/layout/filter-bar";
import { ListPage, ListPageSkeleton } from "@/components/layout/list-page";
import { ListPagination } from "@/components/ui/list-pagination";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Button } from "@/components/ui/button";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";
import {
  archivePlatformSnapshot,
  deletePlatformSnapshot,
  listPlatformSnapshots,
  publishPlatformSnapshot,
} from "@/features/platform/api/snapshots.api";
import { queryKeys } from "@/lib/query/keys";
import { snapshotStatusFilterOptions } from "@/features/platform/utils/select-options";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import type { SnapshotListItem } from "@/features/platform/types/snapshot";

const LIST_SCHEMA = {
  page: { default: "1" },
  status: { default: "all" },
} as const;

const PAGE_LIMIT = 20;

function PlatformSnapshotsPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const [applyTarget, setApplyTarget] = useState<SnapshotListItem | null>(null);
  const [cloneTarget, setCloneTarget] = useState<SnapshotListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SnapshotListItem | null>(null);
  const canManage = useCan(PERMISSIONS["platform.snapshots.manage"]);
  const status = params.status;

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.platform.snapshots.list({
      page,
      limit: PAGE_LIMIT,
      status: status !== "all" ? status : undefined,
    }),
    queryFn: () =>
      listPlatformSnapshots({
        page,
        limit: PAGE_LIMIT,
        status: status !== "all" ? status : undefined,
      }),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.platform.snapshots.all(),
    });

  const publishMutation = useMutation({
    mutationFn: (id: string) => publishPlatformSnapshot(id),
    onSuccess: () => {
      toast.success("Snapshot published");
      void invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archivePlatformSnapshot(id),
    onSuccess: () => {
      toast.success("Snapshot archived");
      void invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePlatformSnapshot(id),
    onSuccess: () => {
      toast.success("Snapshot deleted");
      void invalidate();
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns = useMemo<DataTableColumn<SnapshotListItem>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        sortable: true,
        sortValue: (row) => row.name,
        cell: (row) => (
          <Link
            href={`/platform/snapshots/${row.id}`}
            className="font-medium hover:underline"
          >
            {row.name}
          </Link>
        ),
      },
      {
        id: "businesses",
        header: "Applied",
        cell: (row) => row._count?.businesses ?? 0,
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => (
          <StatusBadge status={row.status} domain="snapshot" />
        ),
      },
    ],
    [],
  );

  const isEmpty = !isLoading && (data?.items.length ?? 0) === 0;

  return (
    <>
      <ListPage
        title="Snapshots"
        description="Reusable business blueprints—navigation, terminology, dashboard layout, and default provisioning assets."
        actions={canManage ? <CreateSnapshotWizard /> : null}
        filters={
          <FilterBar>
            <SearchableSelect
              items={snapshotStatusFilterOptions}
              value={status}
              onValueChange={(v) =>
                setParams({ status: v ?? "all", page: "1" }, { resetPage: true })
              }
              placeholder="Status"
              triggerClassName="w-[180px]"
            />
          </FilterBar>
        }
        pagination={
          data?.meta && !isEmpty ? (
            <ListPagination
              meta={data.meta}
              page={page}
              onPageChange={(p) => setParams({ page: String(p) })}
              label="snapshots"
            />
          ) : null
        }
      >
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          emptyTitle="No snapshots yet"
          emptyDescription="Create a business blueprint to define navigation, labels, dashboard widgets, and default CRM assets for new businesses."
          emptyAction={
            canManage ? (
              <div className="flex flex-wrap justify-center gap-2">
                <CreateSnapshotWizard />
                <Button
                  type="button"
                  variant="outline"
                  disabled
                  title="Clone becomes available once you have at least one snapshot"
                >
                  <Copy className="mr-2 size-4" />
                  Clone existing
                </Button>
              </div>
            ) : undefined
          }
          rowActions={
            canManage
              ? (row) => {
                  const actions: RowAction[] = [
                    {
                      label: "Edit",
                      onClick: () => router.push(`/platform/snapshots/${row.id}`),
                    },
                    {
                      label: "Clone",
                      onClick: () => setCloneTarget(row),
                    },
                  ];
                  if (row.status === "DRAFT") {
                    actions.push({
                      label: "Publish",
                      onClick: () => publishMutation.mutate(row.id),
                    });
                  }
                  if (row.status === "PUBLISHED") {
                    actions.push({
                      label: "Apply to business",
                      onClick: () => setApplyTarget(row),
                    });
                    actions.push({
                      label: "Archive",
                      onClick: () => archiveMutation.mutate(row.id),
                    });
                  }
                  if (row.status === "DRAFT" || row.status === "ARCHIVED") {
                    actions.push({
                      label: "Delete",
                      onClick: () => setDeleteTarget(row),
                      destructive: true,
                    });
                  }
                  return <DataTableRowActions actions={actions} />;
                }
              : undefined
          }
        />
      </ListPage>

      <ApplySnapshotDialog
        snapshot={applyTarget}
        open={!!applyTarget}
        onOpenChange={(open) => !open && setApplyTarget(null)}
      />

      <CloneSnapshotDialog
        snapshot={cloneTarget}
        open={!!cloneTarget}
        onOpenChange={(open) => !open && setCloneTarget(null)}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete snapshot?"
        description={
          <>
            Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  );
}

export function PlatformSnapshotsPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <PlatformSnapshotsPageContent />
    </Suspense>
  );
}
