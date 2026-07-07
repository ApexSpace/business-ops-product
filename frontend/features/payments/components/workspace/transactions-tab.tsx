"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { SearchInput } from "@/components/forms/search-input";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { EntityDetailDrawer } from "@/components/layout/entity-detail-drawer";
import { PaymentFormDrawer } from "@/features/payments/components/payment-form-drawer";
import { FinancialTabPanel } from "@/features/payments/components/workspace/financial-tab-panel";
import { TransactionDetailPanel } from "@/features/payments/components/workspace/transaction-detail-panel";
import { TransactionTableRowActions } from "@/features/payments/components/workspace/transaction-table-row-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListPagination } from "@/components/ui/list-pagination";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";
import {
  WORKSPACE_ACTIVE_ROW_CLASS,
} from "@/lib/design/workspace-tokens";
import { useEntitySelection } from "@/lib/routing/use-entity-selection";
import { usePaymentsTabCreateAction } from "@/features/payments/hooks/use-payments-tab-action";
import { formatMoney } from "@/features/invoices/schemas/invoice-profile";
import {
  PAYMENT_METHOD_OPTIONS,
  canRefundPayment,
  formatTransactionDate,
  formatTransactionProvider,
  formatTransactionSource,
  getTransactionStatusLabel,
} from "@/features/payments/schemas/payment-profile";
import { getPayment } from "@/features/payments/api/payments.api";
import { invalidateFinancialLists } from "@/features/payments/workspace/payments-workspace";
import { viewTransactionInvoicePublic } from "@/features/payments/utils/transaction-invoice-view";
import { queryKeys } from "@/lib/query/keys";
import type { Payment } from "@/features/payments/types";
import { listPayments, refundPayment } from "@/features/payments/api/payments.api";

const LIST_SCHEMA = {
  page: { default: "1" },
  search: { default: "" },
  method: { default: "" },
  paidFrom: { default: "" },
  paidTo: { default: "" },
} as const;

const PAGE_LIMIT = 20;

const methodFilterItems = [
  { value: "", label: "All methods" },
  ...PAYMENT_METHOD_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
];

export function PaymentsTransactionsTab() {
  const queryClient = useQueryClient();
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const debouncedSearch = useDebouncedValue(params.search);
  const {
    selectedId,
    isOpen,
    setSelectedId,
    clearSelection,
  } = useEntitySelection();

  const [createOpen, setCreateOpen] = useState(false);
  const [refundId, setRefundId] = useState<string | null>(null);

  usePaymentsTabCreateAction(() => {
    setCreateOpen(true);
  });

  const listFilters = {
    page,
    limit: PAGE_LIMIT,
    search: debouncedSearch || undefined,
    method: params.method || undefined,
    paidFrom: params.paidFrom || undefined,
    paidTo: params.paidTo || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.payments.list(listFilters),
    queryFn: () => listPayments(listFilters),
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: queryKeys.payments.detail(selectedId ?? ""),
    queryFn: () => getPayment(selectedId!),
    enabled: Boolean(selectedId),
  });

  const selectedListItem = data?.items.find((item) => item.id === selectedId);

  const refundMutation = useMutation({
    mutationFn: (id: string) => refundPayment(id),
    onSuccess: () => {
      toast.success("Transaction refunded");
      void invalidateFinancialLists(queryClient);
      setRefundId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns = useMemo<DataTableColumn<Payment>[]>(
    () => [
      {
        id: "customer",
        header: "Customer",
        className: "min-w-[9rem] max-w-[12rem]",
        cell: (row) => (
          <span className="line-clamp-1 font-medium">
            {row.contact?.label ?? "—"}
          </span>
        ),
      },
      {
        id: "provider",
        header: "Provider",
        className: "whitespace-nowrap",
        cell: (row) => (
          <span className="text-muted-foreground">
            {formatTransactionProvider(row.method)}
          </span>
        ),
      },
      {
        id: "source",
        header: "Source",
        className: "whitespace-nowrap",
        cell: (row) => (
          <span className="tabular-nums text-muted-foreground">
            {formatTransactionSource(row)}
          </span>
        ),
      },
      {
        id: "transactionDate",
        header: "Transaction Date",
        sortable: true,
        sortValue: (row) =>
          new Date(row.paidAt ?? row.createdAt).getTime(),
        className: "whitespace-nowrap",
        cell: (row) => (
          <span className="tabular-nums">
            {formatTransactionDate(row.paidAt ?? row.createdAt)}
          </span>
        ),
      },
      {
        id: "amount",
        header: "Amount",
        sortable: true,
        sortValue: (row) => parseFloat(row.amount) || 0,
        className: "whitespace-nowrap text-right",
        cell: (row) => (
          <span className="font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatMoney(row.amount)}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (row) => getTransactionStatusLabel(row),
        className: "whitespace-nowrap",
        cell: (row) => (
          <StatusBadge
            status={canRefundPayment(row) ? "SUCCEEDED" : "REFUNDED"}
            domain="transaction"
            label={getTransactionStatusLabel(row)}
          />
        ),
      },
    ],
    [],
  );

  const drawerPayment = detail ?? selectedListItem;

  return (
    <>
      <FinancialTabPanel
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 size-4" />
            Record payment
          </Button>
        }
        search={
          <SearchInput
            className="min-w-[12rem] flex-1 shrink-0"
            value={params.search}
            onChange={(search) =>
              setParams({ search, page: "1" }, { resetPage: true })
            }
            placeholder="Search transactions…"
          />
        }
        filters={
          <>
            <SearchableSelect
              items={methodFilterItems}
              value={params.method}
              onValueChange={(method) =>
                setParams({ method: method ?? "", page: "1" }, { resetPage: true })
              }
              placeholder="Provider"
              triggerClassName="w-[10rem] shrink-0"
            />
            <Input
              type="date"
              className="h-[var(--control-height)] w-[10.5rem] shrink-0 text-sm"
              value={params.paidFrom}
              onChange={(e) =>
                setParams({ paidFrom: e.target.value, page: "1" })
              }
              aria-label="Transaction from"
            />
            <Input
              type="date"
              className="h-[var(--control-height)] w-[10.5rem] shrink-0 text-sm"
              value={params.paidTo}
              onChange={(e) =>
                setParams({ paidTo: e.target.value, page: "1" })
              }
              aria-label="Transaction to"
            />
          </>
        }
        pagination={
          data?.meta ? (
            <ListPagination
              meta={data.meta}
              page={page}
              onPageChange={(p) => setParams({ page: String(p) })}
              label="transactions"
            />
          ) : null
        }
      >
        <DataTable
          className="min-w-[48rem]"
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
          emptyTitle="No transactions yet"
          emptyDescription="Transactions are usually recorded from an invoice. Use this list to review history or make corrections."
          emptyAction={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-4" />
              Record payment
            </Button>
          }
          rowActions={(row) => (
            <TransactionTableRowActions
              onView={() => setSelectedId(row.id)}
              onRefund={
                canRefundPayment(row)
                  ? () => setRefundId(row.id)
                  : undefined
              }
            />
          )}
        />
      </FinancialTabPanel>

      <EntityDetailDrawer
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) clearSelection();
        }}
        title={
          drawerPayment
            ? formatMoney(drawerPayment.amount)
            : "Transaction"
        }
        subtitle={
          drawerPayment
            ? formatTransactionSource(drawerPayment)
            : undefined
        }
        isLoading={detailLoading}
        badges={
          drawerPayment ? (
            <StatusBadge
              status={
                canRefundPayment(drawerPayment) ? "SUCCEEDED" : "REFUNDED"
              }
              domain="transaction"
              label={getTransactionStatusLabel(drawerPayment)}
            />
          ) : null
        }
        headerActions={
          drawerPayment?.invoiceId ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void viewTransactionInvoicePublic(drawerPayment)}
            >
              <ExternalLink className="mr-1 size-3.5" />
              View invoice
            </Button>
          ) : null
        }
        footer={
          drawerPayment && canRefundPayment(drawerPayment) ? (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setRefundId(drawerPayment.id)}
            >
              Refund transaction
            </Button>
          ) : null
        }
      >
        {drawerPayment ? (
          <TransactionDetailPanel payment={drawerPayment} />
        ) : null}
      </EntityDetailDrawer>

      <PaymentFormDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => void invalidateFinancialLists(queryClient)}
      />

      <ConfirmDeleteDialog
        open={!!refundId}
        onOpenChange={(open) => !open && setRefundId(null)}
        title="Refund transaction?"
        description="This reverses the payment and updates the linked invoice balance. Stripe payments are refunded through your connected account."
        confirmLabel="Refund"
        isPending={refundMutation.isPending}
        onConfirm={() => refundId && refundMutation.mutate(refundId)}
      />
    </>
  );
}
