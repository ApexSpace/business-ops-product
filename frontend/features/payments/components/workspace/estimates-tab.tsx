"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2  } from "lucide-react";
import { toast } from "sonner";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { EntityDetailDrawer } from "@/components/layout/entity-detail-drawer";
import { EntityListLayout } from "@/components/layout/entity-list-layout";
import { ListFilterCheckboxGroup } from "@/components/layout/list-filter-checkbox-group";
import { EstimateFormDialog } from "@/features/estimates/components/estimate-form-dialog";
import { getEstimate } from "@/features/estimates/api/estimates.api";
import { InvoiceFormDialog } from "@/features/invoices/components/invoice-form-dialog";
import { EstimateDetailPanel } from "@/features/payments/components/workspace/estimate-detail-panel";
import { FinancialRowActionsMenu } from "@/features/payments/components/workspace/financial-row-actions-menu";
import { EstimatesMobileList } from "@/features/payments/components/mobile/estimates-mobile-list";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListPagination } from "@/components/ui/list-pagination";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import {
  WORKSPACE_ACTIVE_ROW_CLASS,
} from "@/lib/design/workspace-tokens";
import { useEntitySelection } from "@/lib/routing/use-entity-selection";
import { useEstimatesTabColumns } from "@/features/payments/hooks/use-estimates-tab-columns";
import { usePaymentsTabCreateAction } from "@/features/payments/hooks/use-payments-tab-action";
import {
  ESTIMATE_MANUAL_STATUS_OPTIONS,
  ESTIMATE_STATUS_OPTIONS,
} from "@/features/estimates/schemas/estimate-profile";
import { invalidateFinancialLists } from "@/features/payments/workspace/payments-workspace";
import { getEstimateQuoteName } from "@/features/payments/utils/financial-table-display";
import { queryKeys } from "@/lib/query/keys";
import { ALL_STATUSES_EMPTY_OPTION } from "@/lib/ui/filter-labels";
import type { Estimate, EstimateStatus } from "@/features/estimates/types";
import {
  deleteEstimate,
  duplicateEstimate,
  listEstimates,
  updateEstimateStatus,
} from "@/features/estimates/api/estimates.api";

const LIST_SCHEMA = {
  page: { default: "1" },
  search: { default: "" },
  status: { default: "" },
  issueFrom: { default: "" },
  issueTo: { default: "" },
} as const;

const PAGE_LIMIT = 20;

const statusFilterItems = [
  ALL_STATUSES_EMPTY_OPTION,
  ...ESTIMATE_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
];

export function PaymentsEstimatesTab() {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const debouncedSearch = useDebouncedValue(params.search);
  const {
    selectedId,
    isOpen,
    setSelectedId,
    clearSelection,
  } = useEntitySelection();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Estimate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [invoiceFromEstimate, setInvoiceFromEstimate] =
    useState<Estimate | null>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState(params.status);
  const [draftFrom, setDraftFrom] = useState(params.issueFrom);
  const [draftTo, setDraftTo] = useState(params.issueTo);

  usePaymentsTabCreateAction(() => {
    setEditing(null);
    setFormOpen(true);
  });

  const listFilters = {
    page,
    limit: PAGE_LIMIT,
    search: debouncedSearch || undefined,
    status: params.status || undefined,
    issueFrom: params.issueFrom || undefined,
    issueTo: params.issueTo || undefined,
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.estimates.list(listFilters),
    queryFn: () => listEstimates(listFilters),
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: queryKeys.estimates.detail(selectedId ?? ""),
    queryFn: () => getEstimate(selectedId!),
    enabled: Boolean(selectedId),
  });

  const selectedListItem = data?.items.find((item) => item.id === selectedId);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEstimate(id),
    onSuccess: () => {
      toast.success("Estimate deleted");
      void invalidateFinancialLists(queryClient);
      setDeleteId(null);
      if (deleteId === selectedId) {
        clearSelection();
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateEstimate(id),
    onSuccess: (created) => {
      toast.success(`Duplicated as ${created.estimateNumber}`);
      void invalidateFinancialLists(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status,
}: { id: string; status: EstimateStatus }) =>
      updateEstimateStatus(id, status),
    onSuccess: () => {
      toast.success("Status updated");
      void invalidateFinancialLists(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (estimate: Estimate) => {
    setEditing(estimate);
    setFormOpen(true);
  };

  const columns = useEstimatesTabColumns();

  return (
    <>
      {isMobile ? (
        isError ? (
          <ApiErrorState error={error} onRetry={() => void refetch()} />
        ) : (
          <EstimatesMobileList
            estimates={data?.items ?? []}
            isLoading={isLoading}
            search={params.search}
            onSearchChange={(search) =>
              setParams({ search, page: "1" }, { resetPage: true })
            }
            selectedId={selectedId}
            onSelect={(row) => setSelectedId(row.id)}
            onCreate={openCreate}
            pagination={
              data?.meta
                ? {
                    meta: data.meta,
                    page,
                    onPageChange: (p) => setParams({ page: String(p) }),
                  }
                : undefined
            }
          />
        )
      ) : (
      <EntityListLayout
        title="Estimates"
        hideHeader
        flush
        addButtonLabel="New estimate"
        onAdd={openCreate}
        searchPlaceholder="Search estimates…"
        searchValue={params.search}
        onSearchChange={(search) =>
          setParams({ search, page: "1" }, { resetPage: true })
        }
        filterAriaLabel="Estimate filters"
        filterActive={Boolean(
          params.status || params.issueFrom || params.issueTo,
        )}
        filterOpen={filterOpen}
        onFilterOpenChange={(open) => {
          if (open) {
            setDraftStatus(params.status);
            setDraftFrom(params.issueFrom);
            setDraftTo(params.issueTo);
          }
          setFilterOpen(open);
        }}
        filterContent={
          <>
            <ListFilterCheckboxGroup
              legend="Status"
              options={statusFilterItems}
              value={draftStatus}
              onChange={(next) => setDraftStatus(String(next))}
            />
            <div className="flex w-full min-w-0 flex-col gap-2">
              <Label htmlFor="estimate-filter-from">Issue from</Label>
              <Input
                id="estimate-filter-from"
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
              />
              <Label htmlFor="estimate-filter-to">Issue to</Label>
              <Input
                id="estimate-filter-to"
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
              />
            </div>
          </>
        }
        onFilterApply={() =>
          setParams(
            {
              status: draftStatus,
              issueFrom: draftFrom,
              issueTo: draftTo,
              page: "1",
            },
            { resetPage: true },
          )
        }
        footer={
          data?.meta ? (
            <ListPagination
              meta={data.meta}
              page={page}
              onPageChange={(p) => setParams({ page: String(p) })}
              label="estimates"
            />
          ) : undefined
        }
        error={
          isError ? (
            <ApiErrorState error={error} onRetry={() => void refetch()} />
          ) : undefined
        }
        tableClassName="min-w-[56rem]"
        columns={columns}
        data={data?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        density="compact"
        activeRowId={selectedId}
        onRowClick={(row) => setSelectedId(row.id)}
        getRowClassName={(row) =>
          selectedId === row.id ? WORKSPACE_ACTIVE_ROW_CLASS : undefined
        }
        actionsColumnHeader="Actions"
        emptyTitle="No estimates yet"
        emptyDescription="Create your first quote for a customer."
        emptyAction={
          <Button variant="brand" onClick={openCreate}>
            New estimate
          </Button>
        }
        rowActions={(row) => (
          <FinancialRowActionsMenu
            onView={() => setSelectedId(row.id)}
            onEdit={() => openEdit(row)}
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
      )}

      <EntityDetailDrawer
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) clearSelection();
        }}
        title={
          detail
            ? getEstimateQuoteName(detail)
            : selectedListItem
              ? getEstimateQuoteName(selectedListItem)
              : "Estimate"
        }
        subtitle={detail?.estimateNumber ?? selectedListItem?.estimateNumber}
        isLoading={detailLoading}
        width="wide"
        badges={
          detail ? (
            <StatusBadge status={detail.status} domain="estimate" />
          ) : null
        }
        headerActions={
          detail ? (
            <Button variant="outline" size="sm" onClick={() => openEdit(detail)}>
              <Pencil className="mr-1 size-3.5" />
              Edit
            </Button>
          ) : null
        }
        overflowActions={
          selectedId
            ? [
                {
                  id: "delete",
                  label: "Delete",
                  icon: <Trash2 className="mr-2 size-4" />,
                  destructive: true,
                  onSelect: () => setDeleteId(selectedId),
                },
              ]
            : undefined
        }
      >
        {detail ? <EstimateDetailPanel estimate={detail} /> : null}
      </EntityDetailDrawer>

      <EstimateFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
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
