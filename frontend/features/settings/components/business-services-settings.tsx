"use client";

import { Suspense, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ServiceFormDialog } from "@/features/services/components/service-form-dialog";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { DataTableRowActions } from "@/components/data-display/data-table-row-actions";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { SearchInput } from "@/components/forms/search-input";
import { FilterBar } from "@/components/layout/filter-bar";
import { ListPage, ListPageSkeleton } from "@/components/layout/list-page";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/ui/list-pagination";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";
import { formatLeadValue } from "@/features/leads/utils/leads";
import {
  invalidateServiceLists,
  invalidateServicePicker,
} from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import type { PaginatedResult, Service } from "@/features/settings/types";
import { deleteService, listServices } from "@/features/settings/api/services.api";

const LIST_SCHEMA = {
  page: { default: "1" },
  search: { default: "" },
} as const;

const PAGE_LIMIT = 20;

function BusinessServicesSettingsContent() {
  const queryClient = useQueryClient();
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const debouncedSearch = useDebouncedValue(params.search);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const listFilters = {
    page,
    limit: PAGE_LIMIT,
    search: debouncedSearch || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.services.list(listFilters),
    queryFn: () =>
      listServices({
        page,
        limit: PAGE_LIMIT,
        search: debouncedSearch || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      deleteService(id),
    onSuccess: () => {
      toast.success("Service deleted");
      void invalidateServiceLists(queryClient);
      void invalidateServicePicker(queryClient);
      setDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns = useMemo<DataTableColumn<Service>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        sortable: true,
        sortValue: (row) => row.name,
        cell: (row) => <span className="font-medium">{row.name}</span>,
      },
      {
        id: "category",
        header: "Category",
        sortable: true,
        sortValue: (row) => row.category ?? "",
        cell: (row) => row.category ?? "—",
      },
      {
        id: "price",
        header: "Price",
        sortable: true,
        sortValue: (row) => row.price ?? 0,
        cell: (row) => formatLeadValue(row.price),
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => <StatusBadge status={row.status} domain="plan" />,
      },
    ],
    [],
  );

  const invalidate = () => {
    void invalidateServiceLists(queryClient);
    void invalidateServicePicker(queryClient);
  };

  return (
    <div className="w-full min-w-0">
      <ListPage
        title="Services"
        description="Your service catalog — linked when creating leads on the CRM board."
        actions={
          <ActionButton
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Add service
          </ActionButton>
        }
        filters={
          <FilterBar>
            <SearchInput
              value={params.search}
              onChange={(value) =>
                setParams({ search: value, page: "1" }, { resetPage: true })
              }
              placeholder="Search services…"
            />
          </FilterBar>
        }
        pagination={
          data?.meta ? (
            <ListPagination
              meta={data.meta}
              page={page}
              onPageChange={(p) => setParams({ page: String(p) })}
              label="services"
            />
          ) : null
        }
      >
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          emptyTitle="No services yet"
          emptyDescription="Add offerings like Botox, AC repair, or consultations."
          emptyAction={
            <ActionButton
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 size-4" />
              Add service
            </ActionButton>
          }
          rowActions={(service) => (
            <DataTableRowActions
              actions={[
                {
                  label: "Edit",
                  onClick: () => {
                    setEditing(service);
                    setDialogOpen(true);
                  },
                },
                {
                  label: "Delete",
                  onClick: () => setDeleteId(service.id),
                  destructive: true,
                },
              ]}
            />
          )}
        />
      </ListPage>

      <ServiceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        service={editing}
        onSuccess={invalidate}
      />

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete service?"
        description="Leads linked to this service will keep their other details; the service link will be cleared."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}

export function BusinessServicesSettings() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <BusinessServicesSettingsContent />
    </Suspense>
  );
}
