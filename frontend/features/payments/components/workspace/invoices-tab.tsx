"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
} from "@/components/data-display/data-table";
import { SearchInput } from "@/components/forms/search-input";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { FilterBar } from "@/components/layout/filter-bar";
import { InvoiceFormDialog } from "@/features/invoices/components/invoice-form-dialog";
import { PaymentFormDialog } from "@/features/payments/components/payment-form-dialog";
import { InvoiceTableRowActions } from "@/features/payments/components/workspace/invoice-table-row-actions";
import { FinancialTabPanel } from "@/features/payments/components/workspace/financial-tab-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListPagination } from "@/components/ui/list-pagination";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";
import { useInvoicesTabColumns } from "@/features/payments/hooks/use-invoices-tab-columns";
import { usePaymentsTabCreateAction } from "@/features/payments/hooks/use-payments-tab-action";
import {
  canRecordInvoicePayment,
  INVOICE_STATUS_OPTIONS,
} from "@/features/invoices/schemas/invoice-profile";
import { invalidateFinancialLists } from "@/features/payments/workspace/payments-workspace";
import { queryKeys } from "@/lib/query/keys";
import type { Invoice, InvoiceStatus } from "@/features/invoices/types";
import type { PaginatedResult } from "@/lib/types/shared";
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
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const debouncedSearch = useDebouncedValue(params.search);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

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
    queryKey: queryKeys.invoices.list(listFilters),
    queryFn: () => listInvoices(listFilters),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) =>
      duplicateInvoice(id),
    onSuccess: (created) => {
      toast.success(`Duplicated as ${created.invoiceNumber}`);
      void invalidateFinancialLists(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      updateInvoiceStatus(id, status),
    onSuccess: () => {
      toast.success("Status updated");
      void invalidateFinancialLists(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openInvoiceEditor = (invoice: Invoice) => {
    setEditing(invoice);
    setDialogOpen(true);
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
            New invoice
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
              placeholder="Search invoices…"
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
              label="invoices"
            />
          ) : null
        }
      >
        <div className="-mx-1 overflow-x-auto px-1">
          <DataTable
            className="min-w-[60rem]"
            density="compact"
            columns={columns}
            data={data?.items ?? []}
            getRowId={(row) => row.id}
            isLoading={isLoading}
            actionsColumnHeader="Actions"
            emptyTitle="No invoices yet"
            emptyDescription="Create your first invoice for a customer."
            emptyAction={
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-2 size-4" />
                New invoice
              </Button>
            }
            rowActions={(row) => (
              <InvoiceTableRowActions
                invoice={row}
                canCopyLink={canCopyLink(row)}
                onView={() => viewInvoicePublic(row)}
                onEdit={
                  row.status !== "PAID"
                    ? () => openInvoiceEditor(row)
                    : undefined
                }
                onDuplicate={() => duplicateMutation.mutate(row.id)}
                onVoid={
                  canVoid(row)
                    ? () =>
                        statusMutation.mutate({ id: row.id, status: "VOID" })
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
        </div>
      </FinancialTabPanel>

      <InvoiceFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        invoice={editing}
        onSuccess={() => void invalidateFinancialLists(queryClient)}
      />

      <PaymentFormDialog
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
