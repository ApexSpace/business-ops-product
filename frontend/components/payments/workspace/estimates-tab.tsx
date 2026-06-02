"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { SearchInput } from "@/components/forms/search-input";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { FilterBar } from "@/components/layout/filter-bar";
import { EstimateFormDialog } from "@/components/estimates/estimate-form-dialog";
import { InvoiceFormDialog } from "@/components/invoices/invoice-form-dialog";
import { FinancialRowActionsMenu } from "@/components/payments/workspace/financial-row-actions-menu";
import { FinancialTabPanel } from "@/components/payments/workspace/financial-tab-panel";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ListPagination } from "@/components/ui/list-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useListSearchParams } from "@/hooks/use-list-search-params";
import { usePaymentsTabCreateAction } from "@/hooks/use-payments-tab-action";
import { apiClient } from "@/lib/api-client";
import {
  ESTIMATE_MANUAL_STATUS_OPTIONS,
  ESTIMATE_STATUS_OPTIONS,
  formatEstimateDate,
  formatMoney,
} from "@/lib/estimate-profile";
import { getEstimateQuoteName } from "@/lib/financial-table-display";
import { invalidateFinancialLists } from "@/lib/payments-workspace";
import { queryKeys } from "@/lib/query-keys";
import type { Estimate, EstimateStatus, PaginatedResult } from "@/types/api";

const LIST_SCHEMA = {
  page: { default: "1" },
  search: { default: "" },
  status: { default: "" },
  issueFrom: { default: "" },
  issueTo: { default: "" },
} as const;

const PAGE_LIMIT = 20;

const statusFilterItems = [
  { value: "", label: "All statuses" },
  ...ESTIMATE_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
];

export function PaymentsEstimatesTab() {
  const queryClient = useQueryClient();
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const debouncedSearch = useDebouncedValue(params.search);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Estimate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [invoiceFromEstimate, setInvoiceFromEstimate] =
    useState<Estimate | null>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  usePaymentsTabCreateAction(() => {
    setEditing(null);
    setDialogOpen(true);
  });

  const listFilters = {
    page,
    limit: PAGE_LIMIT,
    search: debouncedSearch || undefined,
    status: params.status || undefined,
    issueFrom: params.issueFrom || undefined,
    issueTo: params.issueTo || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.estimates.list(listFilters),
    queryFn: () =>
      apiClient<PaginatedResult<Estimate>>("estimates", {
        searchParams: {
          page,
          limit: PAGE_LIMIT,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(params.status ? { status: params.status } : {}),
          ...(params.issueFrom ? { issueFrom: params.issueFrom } : {}),
          ...(params.issueTo ? { issueTo: params.issueTo } : {}),
        },
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`estimates/${id}`, {
        method: "DELETE",
        searchParams: { confirm: true },
      }),
    onSuccess: () => {
      toast.success("Estimate deleted");
      void invalidateFinancialLists(queryClient);
      setDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient<Estimate>(`estimates/${id}/duplicate`, { method: "POST" }),
    onSuccess: (created) => {
      toast.success(`Duplicated as ${created.estimateNumber}`);
      void invalidateFinancialLists(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: EstimateStatus }) =>
      apiClient<Estimate>(`estimates/${id}/status`, {
        method: "PATCH",
        body: { status },
      }),
    onSuccess: () => {
      toast.success("Status updated");
      void invalidateFinancialLists(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openEstimate = (estimate: Estimate) => {
    setEditing(estimate);
    setDialogOpen(true);
  };

  const columns = useMemo<DataTableColumn<Estimate>[]>(
    () => [
      {
        id: "quoteName",
        header: "Quote Name",
        className: "min-w-[10rem] max-w-[14rem]",
        cell: (row) => (
          <span className="line-clamp-2 font-medium text-foreground">
            {getEstimateQuoteName(row)}
          </span>
        ),
      },
      {
        id: "estimateNumber",
        header: "Estimate Number",
        className: "whitespace-nowrap",
        cell: (row) => (
          <span className="tabular-nums text-muted-foreground">
            {row.estimateNumber}
          </span>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        className: "min-w-[8rem] max-w-[12rem]",
        cell: (row) => (
          <span className="line-clamp-1">{row.contact?.label ?? "—"}</span>
        ),
      },
      {
        id: "issueDate",
        header: "Issue Date",
        sortable: true,
        sortValue: (row) => new Date(row.issueDate).getTime(),
        className: "whitespace-nowrap",
        cell: (row) => (
          <span className="tabular-nums">{formatEstimateDate(row.issueDate)}</span>
        ),
      },
      {
        id: "value",
        header: "Value",
        sortable: true,
        sortValue: (row) => parseFloat(row.totalAmount) || 0,
        className: "whitespace-nowrap text-right",
        cell: (row) => (
          <span className="font-medium tabular-nums">
            {formatMoney(row.totalAmount)}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (row) => row.status,
        className: "whitespace-nowrap",
        cell: (row) => (
          <StatusBadge status={row.status} domain="estimate" />
        ),
      },
    ],
    [],
  );

  return (
    <>
      <FinancialTabPanel
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1.5 size-4" />
            New estimate
          </Button>
        }
        filters={
          <FilterBar className="w-full flex-nowrap items-stretch gap-2 overflow-x-auto">
            <SearchInput
              className="min-w-[12rem] flex-1 shrink-0"
              value={params.search}
              onChange={(search) =>
                setParams({ search, page: "1" }, { resetPage: true })
              }
              placeholder="Search estimates…"
            />
            <SearchableSelect
              items={statusFilterItems}
              value={params.status}
              onValueChange={(status) =>
                setParams({ status: status ?? "", page: "1" }, { resetPage: true })
              }
              placeholder="Status"
              triggerClassName="w-[9.5rem] shrink-0"
            />
            <Input
              type="date"
              className="h-[var(--control-height)] w-[10.5rem] shrink-0 text-sm"
              value={params.issueFrom}
              onChange={(e) =>
                setParams({ issueFrom: e.target.value, page: "1" })
              }
              aria-label="Issue from"
            />
            <Input
              type="date"
              className="h-[var(--control-height)] w-[10.5rem] shrink-0 text-sm"
              value={params.issueTo}
              onChange={(e) =>
                setParams({ issueTo: e.target.value, page: "1" })
              }
              aria-label="Issue to"
            />
          </FilterBar>
        }
        pagination={
          data?.meta ? (
            <ListPagination
              meta={data.meta}
              page={page}
              onPageChange={(p) => setParams({ page: String(p) })}
              label="estimates"
            />
          ) : null
        }
      >
        <div className="-mx-1 overflow-x-auto px-1">
          <DataTable
            className="min-w-[56rem]"
            density="compact"
            columns={columns}
            data={data?.items ?? []}
            getRowId={(row) => row.id}
            isLoading={isLoading}
            actionsColumnHeader="Actions"
            emptyTitle="No estimates yet"
            emptyDescription="Create your first quote for a customer."
            emptyAction={
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-2 size-4" />
                New estimate
              </Button>
            }
            rowActions={(row) => (
              <FinancialRowActionsMenu
                onView={() => openEstimate(row)}
                onEdit={() => openEstimate(row)}
                onDuplicate={() => duplicateMutation.mutate(row.id)}
                onDelete={() => setDeleteId(row.id)}
                statusOptions={ESTIMATE_MANUAL_STATUS_OPTIONS}
                onStatusChange={(status) =>
                  statusMutation.mutate({ id: row.id, status })
                }
                extraItems={
                  <DropdownMenuItem
                    onClick={() => {
                      setInvoiceFromEstimate(row);
                      setInvoiceDialogOpen(true);
                    }}
                  >
                    Create Invoice
                  </DropdownMenuItem>
                }
              />
            )}
          />
        </div>
      </FinancialTabPanel>

      <EstimateFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        estimate={editing}
        onSuccess={() => void invalidateFinancialLists(queryClient)}
      />

      <InvoiceFormDialog
        open={invoiceDialogOpen}
        onOpenChange={(open) => {
          setInvoiceDialogOpen(open);
          if (!open) setInvoiceFromEstimate(null);
        }}
        prefillFromEstimate={invoiceFromEstimate}
        lockContact={!!invoiceFromEstimate?.contactId}
        defaultContactId={invoiceFromEstimate?.contactId}
        defaultContactLabel={invoiceFromEstimate?.contact?.label}
        onSuccess={() => void invalidateFinancialLists(queryClient)}
      />

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete estimate?"
        description="This estimate will be removed. This cannot be undone."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </>
  );
}
