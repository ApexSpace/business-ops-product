"use client";

import { Suspense, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { DataTableRowActions } from "@/components/data-display/data-table-row-actions";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { SearchInput } from "@/components/forms/search-input";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { FilterBar } from "@/components/layout/filter-bar";
import { ListPage, ListPageSkeleton } from "@/components/layout/list-page";
import { WorkItemBoard } from "@/components/work-items/work-item-board";
import { WorkItemFormDialog } from "@/components/work-items/work-item-form-dialog";
import {
  WorkItemsViewSwitcher,
  type WorkItemsView,
} from "@/components/work-items/work-items-view-switcher";
import { ActionButton } from "@/components/ui/action-button";
import { ListPagination } from "@/components/ui/list-pagination";
import { getIndustryLabels } from "@/config/industry-labels";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useListSearchParams } from "@/hooks/use-list-search-params";
import { apiClient } from "@/lib/api-client";
import {
  invalidateBusinessDashboardStats,
  invalidateWorkItemLists,
} from "@/lib/query-invalidation";
import { queryKeys } from "@/lib/query-keys";
import {
  formatWorkItemAmount,
  formatWorkItemScheduledAt,
  WORK_ITEM_STATUS_OPTIONS,
} from "@/lib/work-item-profile";
import {
  FILTER_SEARCH_CLASS,
  FILTER_SELECT_TRIGGER_CLASS,
} from "@/lib/control-styles";
import { cn } from "@/lib/utils";
import type {
  Business,
  BusinessMember,
  PaginatedResult,
  Service,
  WorkItem,
  WorkItemStatus,
} from "@/types/api";

const LIST_SCHEMA = {
  page: { default: "1" },
  search: { default: "" },
  status: { default: "" },
  serviceId: { default: "" },
  assignedToId: { default: "" },
  view: { default: "board" },
} as const;

const TABLE_PAGE_LIMIT = 20;
const BOARD_PAGE_LIMIT = 100;

const statusFilterItems = [
  { value: "", label: "All statuses" },
  ...WORK_ITEM_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
];

function BusinessWorkItemsPageContent() {
  const queryClient = useQueryClient();
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const debouncedSearch = useDebouncedValue(params.search);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WorkItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const view: WorkItemsView = params.view === "table" ? "table" : "board";
  const isBoardView = view === "board";
  const listPage = isBoardView ? 1 : page;
  const listLimit = isBoardView ? BOARD_PAGE_LIMIT : TABLE_PAGE_LIMIT;

  const { data: business } = useQuery({
    queryKey: queryKeys.business.current(),
    queryFn: () => apiClient<Business>("businesses/current"),
  });
  const labels = getIndustryLabels(business?.industry);
  const workItemsLabel = labels.workItems;

  const listFilters = {
    page: listPage,
    limit: listLimit,
    search: debouncedSearch || undefined,
    status: params.status || undefined,
    serviceId: params.serviceId || undefined,
    assignedToId: params.assignedToId || undefined,
    view,
  };

  const listQueryKey = queryKeys.workItems.list(listFilters);

  const { data, isLoading } = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      apiClient<PaginatedResult<WorkItem>>("work-items", {
        searchParams: {
          page: listPage,
          limit: listLimit,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(params.status ? { status: params.status } : {}),
          ...(params.serviceId ? { serviceId: params.serviceId } : {}),
          ...(params.assignedToId
            ? { assignedToId: params.assignedToId }
            : {}),
        },
      }),
  });

  const { data: services } = useQuery({
    queryKey: queryKeys.services.picker(),
    queryFn: () =>
      apiClient<PaginatedResult<Service>>("services", {
        searchParams: { page: 1, limit: 100, status: "ACTIVE" },
      }),
  });

  const { data: members } = useQuery({
    queryKey: queryKeys.business.members({ page: 1, limit: 100 }),
    queryFn: () =>
      apiClient<PaginatedResult<BusinessMember>>("businesses/current/members", {
        searchParams: { page: 1, limit: 100 },
      }),
  });

  const serviceFilterItems = useMemo(
    () => [
      { value: "", label: "All services" },
      ...(services?.items.map((s) => ({
        value: s.id,
        label: s.category ? `${s.name} (${s.category})` : s.name,
      })) ?? []),
    ],
    [services?.items],
  );

  const assigneeFilterItems = useMemo(
    () => [
      { value: "", label: "All staff" },
      ...(members?.items.map((m) => ({
        value: m.user.id,
        label:
          [m.user.firstName, m.user.lastName].filter(Boolean).join(" ") ||
          m.user.email,
      })) ?? []),
    ],
    [members?.items],
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`work-items/${id}`, {
        method: "DELETE",
        searchParams: { confirm: true },
      }),
    onSuccess: () => {
      toast.success("Deleted");
      void invalidateWorkItemLists(queryClient);
      void invalidateBusinessDashboardStats(queryClient);
      setDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns = useMemo<DataTableColumn<WorkItem>[]>(
    () => [
      {
        id: "title",
        header: "Title",
        sortable: true,
        sortValue: (row) => row.title,
        cell: (row) => <span className="font-medium">{row.title}</span>,
      },
      {
        id: "contact",
        header: labels.contacts.replace(/s$/, "") || "Customer",
        sortable: true,
        sortValue: (row) => row.contact?.label ?? "",
        cell: (row) => row.contact?.label ?? "—",
      },
      {
        id: "service",
        header: "Service",
        cell: (row) => row.service?.name ?? "—",
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <StatusBadge status={row.status} domain="workItem" />
        ),
      },
      {
        id: "scheduled",
        header: "Scheduled",
        sortable: true,
        sortValue: (row) => row.scheduledAt ?? "",
        cell: (row) => formatWorkItemScheduledAt(row.scheduledAt) ?? "—",
      },
      {
        id: "amount",
        header: "Amount",
        cell: (row) => formatWorkItemAmount(row.amount) ?? "—",
      },
    ],
    [labels.contacts],
  );

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (item: WorkItem) => {
    setEditing(item);
    setDialogOpen(true);
  };

  return (
    <>
      <ListPage
        title={workItemsLabel}
        description="Record customer, service, and work done — without a CRM pipeline."
        actions={
          <>
            <WorkItemsViewSwitcher
              value={view}
              onChange={(next) =>
                setParams({ view: next, page: "1" }, { resetPage: true })
              }
            />
            <ActionButton onClick={openCreate}>
              <Plus className="mr-2 size-4" />
              Add {workItemsLabel.toLowerCase().replace(/s$/, "") || "item"}
            </ActionButton>
          </>
        }
        filters={
          <FilterBar className="shrink-0 flex-nowrap items-center gap-2 sm:gap-3">
            <SearchInput
              className={cn(FILTER_SEARCH_CLASS, "w-[13rem] sm:w-[17rem]")}
              value={params.search}
              onChange={(value) =>
                setParams({ search: value, page: "1" }, { resetPage: true })
              }
              placeholder={`Search ${workItemsLabel.toLowerCase()}…`}
            />
            <SearchableSelect
              items={statusFilterItems}
              value={params.status}
              onValueChange={(value) =>
                setParams(
                  { status: value ?? "", page: "1" },
                  { resetPage: true },
                )
              }
              placeholder="Status"
              triggerClassName={cn(FILTER_SELECT_TRIGGER_CLASS, "w-[9.5rem]")}
            />
            <SearchableSelect
              items={serviceFilterItems}
              value={params.serviceId}
              onValueChange={(value) =>
                setParams(
                  { serviceId: value ?? "", page: "1" },
                  { resetPage: true },
                )
              }
              placeholder="Service"
              triggerClassName={cn(FILTER_SELECT_TRIGGER_CLASS, "w-[11rem]")}
            />
            <SearchableSelect
              items={assigneeFilterItems}
              value={params.assignedToId}
              onValueChange={(value) =>
                setParams(
                  { assignedToId: value ?? "", page: "1" },
                  { resetPage: true },
                )
              }
              placeholder="Staff"
              triggerClassName={cn(FILTER_SELECT_TRIGGER_CLASS, "w-[11rem]")}
            />
          </FilterBar>
        }
        pagination={
          !isBoardView && data?.meta ? (
            <ListPagination
              meta={data.meta}
              page={page}
              onPageChange={(p) => setParams({ page: String(p) })}
              label={workItemsLabel.toLowerCase()}
            />
          ) : null
        }
        className={cn(isBoardView && "min-h-0")}
      >
        {isBoardView ? (
          <WorkItemBoard
            items={data?.items ?? []}
            isLoading={isLoading}
            statusFilter={(params.status as WorkItemStatus) || ""}
            listQueryKey={listQueryKey}
            truncatedTotal={data?.meta.total}
            countSingular={
              workItemsLabel.toLowerCase().replace(/s$/, "") || "item"
            }
            countPlural={workItemsLabel.toLowerCase()}
            onEdit={openEdit}
            onDelete={setDeleteId}
          />
        ) : (
          <DataTable
            columns={columns}
            data={data?.items ?? []}
            getRowId={(row) => row.id}
            isLoading={isLoading}
            emptyTitle={`No ${workItemsLabel.toLowerCase()} yet`}
            emptyDescription="Add your first record: pick a customer, service, and status."
            emptyAction={
              <ActionButton onClick={openCreate}>
                <Plus className="mr-2 size-4" />
                Add {workItemsLabel.toLowerCase().replace(/s$/, "") || "item"}
              </ActionButton>
            }
            rowActions={(item) => (
              <DataTableRowActions
                actions={[
                  { label: "Edit", onClick: () => openEdit(item) },
                  {
                    label: "Delete",
                    onClick: () => setDeleteId(item.id),
                    destructive: true,
                  },
                ]}
              />
            )}
          />
        )}
      </ListPage>

      <WorkItemFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workItem={editing}
        onSuccess={() => {
          void invalidateWorkItemLists(queryClient);
          void invalidateBusinessDashboardStats(queryClient);
        }}
      />

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={`Delete ${workItemsLabel.toLowerCase().replace(/s$/, "") || "item"}?`}
        description="This action cannot be undone."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </>
  );
}

export default function BusinessWorkItemsPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <BusinessWorkItemsPageContent />
    </Suspense>
  );
}
