"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Pencil } from "lucide-react";
import { toast } from "sonner";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import { DataTable } from "@/components/data-display/data-table";
import { StatusBadge } from "@/components/data-display/status-badge";
import { SearchInput } from "@/components/forms/search-input";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { EntityDetailDrawer } from "@/components/layout/entity-detail-drawer";
import { EntityDetailFooter } from "@/components/layout/entity-detail-footer";
import { getInvoice } from "@/features/invoices/api/invoices.api";
import { InvoiceFormDialog } from "@/features/invoices/components/invoice-form-dialog";
import { InvoiceDetailPanel } from "@/features/payments/components/workspace/invoice-detail-panel";
import { PaymentFormDrawer } from "@/features/payments/components/payment-form-drawer";
import { InvoiceTableRowActions } from "@/features/payments/components/workspace/invoice-table-row-actions";
import { FinancialTabPanel } from "@/features/payments/components/workspace/financial-tab-panel";
import { InvoicesMobileList } from "@/features/payments/components/mobile/invoices-mobile-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListPagination } from "@/components/ui/list-pagination";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import {
  WORKSPACE_ACTIVE_ROW_CLASS,
} from "@/lib/design/workspace-tokens";
import { useEntitySelection } from "@/lib/routing/use-entity-selection";
import { useInvoicesTabColumns } from "@/features/payments/hooks/use-invoices-tab-columns";
import { usePaymentsTabCreateAction } from "@/features/payments/hooks/use-payments-tab-action";
import {
  canRecordInvoicePayment,
  INVOICE_STATUS_OPTIONS,
} from "@/features/invoices/schemas/invoice-profile";
import { invalidateFinancialLists } from "@/features/payments/workspace/payments-workspace";
import { getInvoiceDisplayName } from "@/features/payments/utils/financial-table-display";
import { queryKeys } from "@/lib/query/keys";
import type { Invoice, InvoiceStatus } from "@/features/invoices/types";
import {
  duplicateInvoice,
  listInvoices,
  updateInvoiceStatus,
} from "@/features/invoices/api/invoices.api";
import { openInvoicePublicView } from "@/features/invoices/utils/invoice-payment-link";

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
  ...INVOICE_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
];

export function PaymentsInvoicesTab() {
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
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

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
    queryKey: queryKeys.invoices.list(listFilters),
    queryFn: () => listInvoices(listFilters),
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: queryKeys.invoices.detail(selectedId ?? ""),
    queryFn: () => getInvoice(selectedId!),
    enabled: Boolean(selectedId),
  });

  const selectedListItem = data?.items.find((item) => item.id === selectedId);

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateInvoice(id),
    onSuccess: (created) => {
      toast.success(`Duplicated as ${created.invoiceNumber}`);
      void invalidateFinancialLists(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status,
}: { id: string; status: InvoiceStatus }) =>
      updateInvoiceStatus(id, status),
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

  const openEdit = (invoice: Invoice) => {
    setEditing(invoice);
    setFormOpen(true);
  };

  const viewInvoicePublic = (invoice: Invoice) => {
    if (!openInvoicePublicView(invoice)) {
      toast.error("Public link is not available for this invoice");
    }
  };

  const canRecordPayment = (row: Invoice) => canRecordInvoicePayment(row);
  const canCopyLink = (row: Invoice) => row.status !== "VOID";
  const canVoid = (row: Invoice) => row.status !== "VOID";

  const columns = useInvoicesTabColumns();

  return (
    <>
      {isMobile ? (
        isError ? (
          <ApiErrorState error={error} onRetry={() => void refetch()} />
        ) : (
          <InvoicesMobileList
            invoices={data?.items ?? []}
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
      <FinancialTabPanel
        actions={
          <Button size="sm" onClick={openCreate}>
            New invoice
          </Button>
        }
        search={
          <SearchInput
            className="min-w-[12rem] flex-1 shrink-0"
            value={params.search}
            onChange={(search) =>
              setParams({ search, page: "1" }, { resetPage: true })
            }
            placeholder="Search invoices…"
          />
        }
        filters={
          <>
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
          </>
        }
        pagination={
          data?.meta ? (
            <ListPagination
              meta={data.meta}
              page={page}
              onPageChange={(p) => setParams({ page: String(p) })}
              label="invoices"
            />
          ) : null
        }
      >
        {isError ? (
          <ApiErrorState error={error} onRetry={() => void refetch()} />
        ) : (
        <DataTable
          className="min-w-[60rem]"
          density="compact"
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          activeRowId={selectedId}
          onRowClick={(row) => setSelectedId(row.id)}
          getRowClassName={(row) =>
            selectedId === row.id ? WORKSPACE_ACTIVE_ROW_CLASS : undefined
          }
          actionsColumnHeader="Actions"
          emptyTitle="No invoices yet"
          emptyDescription="Create your first invoice for a customer."
          emptyAction={
            <Button size="sm" onClick={openCreate}>
              New invoice
            </Button>
          }
          rowActions={(row) => (
            <InvoiceTableRowActions
              invoice={row}
              canCopyLink={canCopyLink(row)}
              onView={() => setSelectedId(row.id)}
              onEdit={
                row.status !== "PAID" ? () => openEdit(row) : undefined
              }
              onDuplicate={() => duplicateMutation.mutate(row.id)}
              onVoid={
                canVoid(row)
                  ? () => statusMutation.mutate({ id: row.id, status: "VOID" })
                  : undefined
              }
              onRecordPayment={
                canRecordPayment(row)
                  ? () => {
                      setPaymentInvoiceId(row.id);
                      setPaymentDialogOpen(true);
                    }
                  : undefined
              }
            />
          )}
        />
        )}
      </FinancialTabPanel>
      )}

      <EntityDetailDrawer
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) clearSelection();
        }}
        title={
          detail
            ? getInvoiceDisplayName(detail)
            : selectedListItem
              ? getInvoiceDisplayName(selectedListItem)
              : "Invoice"
        }
        subtitle={detail?.invoiceNumber ?? selectedListItem?.invoiceNumber}
        isLoading={detailLoading}
        width="wide"
        badges={
          detail ? (
            <StatusBadge status={detail.status} domain="invoice" />
          ) : null
        }
        headerActions={
          detail ? (
            <>
              {detail.status !== "PAID" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(detail)}
                >
                  <Pencil className="mr-1 size-3.5" />
                  Edit
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                onClick={() => viewInvoicePublic(detail)}
              >
                <ExternalLink className="mr-1 size-3.5" />
                Public view
              </Button>
            </>
          ) : null
        }
        footer={
          detail && canRecordPayment(detail) ? (
            <EntityDetailFooter>
              <Button
                className="min-h-[2.75rem] w-full sm:w-auto sm:min-w-[12rem]"
                onClick={() => {
                  setPaymentInvoiceId(detail.id);
                  setPaymentDialogOpen(true);
                }}
              >
                Record payment
              </Button>
            </EntityDetailFooter>
          ) : null
        }
      >
        {detail ? <InvoiceDetailPanel invoice={detail} /> : null}
      </EntityDetailDrawer>

      <InvoiceFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        invoice={editing}
        onSuccess={() => void invalidateFinancialLists(queryClient)}
      />

      <PaymentFormDrawer
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          setPaymentDialogOpen(open);
          if (!open) setPaymentInvoiceId(null);
        }}
        defaultInvoiceId={paymentInvoiceId ?? undefined}
        lockInvoice={!!paymentInvoiceId}
        onSuccess={() => void invalidateFinancialLists(queryClient)}
      />
    </>
  );
}
