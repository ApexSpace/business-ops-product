"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import { ApiErrorState } from "@/components/data-display/api-error-state";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { SearchInput } from "@/components/forms/search-input";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { EntityDetailDrawer } from "@/components/layout/entity-detail-drawer";
import { EntityDetailFooter } from "@/components/layout/entity-detail-footer";
import { DrawerShell } from "@/components/layout/drawer-shell";
import { DrawerPrimaryButton } from "@/components/drawer/drawer-primary-button";
import { PaymentFormDrawer } from "@/features/payments/components/payment-form-drawer";
import { FinancialTabPanel } from "@/features/payments/components/workspace/financial-tab-panel";
import { TransactionDetailPanel } from "@/features/payments/components/workspace/transaction-detail-panel";
import { TransactionTableRowActions } from "@/features/payments/components/workspace/transaction-table-row-actions";
import { TransactionsMobileList } from "@/features/payments/components/mobile/transactions-mobile-list";
import { Button } from "@/components/ui/button";
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
import { usePaymentsTabCreateAction } from "@/features/payments/hooks/use-payments-tab-action";
import {
  PAYMENT_METHOD_OPTIONS,
  canRefundPayment,
  canStaffRefundPayment,
  formatMoney,
  formatTransactionDate,
  formatTransactionProvider,
  formatTransactionSource,
  getTransactionStatusLabel,
} from "@/features/payments/schemas/payment-profile";
import { getPayment } from "@/features/payments/api/payments.api";
import { invalidateFinancialLists } from "@/features/payments/workspace/payments-workspace";
import { viewTransactionInvoicePublic } from "@/features/payments/utils/transaction-invoice-view";
import { useSalesStaffPermissions } from "@/features/sales/hooks/use-sales-staff-permissions";
import {
  SALES_DRAWER_BODY_INSET_CLASS,
  SALES_DRAWER_FIELD_CLASS,
  SALES_DRAWER_FOOTER_CLASS,
  SALES_DRAWER_FOOTER_INNER_CLASS,
  SALES_DRAWER_FORM_FIELDS_CLASS,
  SALES_DRAWER_MOBILE_SHELL_CLASS,
} from "@/features/sales/styles/sales-drawer-tokens";
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
  const isMobile = useIsMobile();
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const debouncedSearch = useDebouncedValue(params.search);
  const { canRefundAll, canRefundOpen } = useSalesStaffPermissions();
  const {
    selectedId,
    isOpen,
    setSelectedId,
    clearSelection,
  } = useEntitySelection();

  const [createOpen, setCreateOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [refundId, setRefundId] = useState<string | null>(null);

  const canRefundRow = (payment: Payment) =>
    canStaffRefundPayment(payment, { canRefundAll, canRefundOpen });

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

  const { data, isLoading, isError, error, refetch } = useQuery({
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
  const transactions = data?.items ?? [];

  return (
    <>
      {isMobile ? (
        isError ? (
          <ApiErrorState error={error} onRetry={() => void refetch()} />
        ) : (
          <TransactionsMobileList
            transactions={transactions}
            isLoading={isLoading}
            search={params.search}
            onSearchChange={(search) =>
              setParams({ search, page: "1" }, { resetPage: true })
            }
            selectedId={selectedId}
            onSelect={(row) => setSelectedId(row.id)}
            onOpenFilters={() => setFiltersOpen(true)}
            onCreate={() => setCreateOpen(true)}
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
        {isError ? (
          <ApiErrorState error={error} onRetry={() => void refetch()} />
        ) : (
        <DataTable
          className="min-w-[48rem]"
          density="compact"
          columns={columns}
          data={transactions}
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
                canRefundRow(row)
                  ? () => setRefundId(row.id)
                  : undefined
              }
            />
          )}
        />
        )}
      </FinancialTabPanel>
      )}

      <DrawerShell
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        variant="sheet"
        width="appointment"
        chrome="mobile-brand"
        className={SALES_DRAWER_MOBILE_SHELL_CLASS}
        contentClassName="!px-0 !py-0"
        footerClassName={SALES_DRAWER_FOOTER_CLASS}
        title="Options"
        footer={
          <div className={SALES_DRAWER_FOOTER_INNER_CLASS}>
            <DrawerPrimaryButton onClick={() => setFiltersOpen(false)}>
              Apply
            </DrawerPrimaryButton>
          </div>
        }
      >
        <div className={SALES_DRAWER_BODY_INSET_CLASS}>
          <div className={SALES_DRAWER_FORM_FIELDS_CLASS}>
            <div className="space-y-1.5">
              <Label htmlFor="tx-method">Provider</Label>
              <SearchableSelect
                items={methodFilterItems}
                value={params.method}
                onValueChange={(method) =>
                  setParams(
                    { method: method ?? "", page: "1" },
                    { resetPage: true },
                  )
                }
                placeholder="Select method"
                triggerClassName={SALES_DRAWER_FIELD_CLASS}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-from">From date</Label>
              <Input
                id="tx-from"
                type="date"
                className={SALES_DRAWER_FIELD_CLASS}
                value={params.paidFrom}
                onChange={(e) =>
                  setParams({ paidFrom: e.target.value, page: "1" })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-to">To date</Label>
              <Input
                id="tx-to"
                type="date"
                className={SALES_DRAWER_FIELD_CLASS}
                value={params.paidTo}
                onChange={(e) =>
                  setParams({ paidTo: e.target.value, page: "1" })
                }
              />
            </div>
          </div>
        </div>
      </DrawerShell>

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
          drawerPayment && canRefundRow(drawerPayment) ? (
            <EntityDetailFooter>
              <Button
                variant="destructive"
                className="min-h-[2.75rem] w-full sm:w-auto sm:min-w-[12rem]"
                onClick={() => setRefundId(drawerPayment.id)}
              >
                Refund transaction
              </Button>
            </EntityDetailFooter>
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
