"use client";

import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { formatPaymentDate } from "@/features/payments/schemas/payment-profile";
import type { BusinessBillingInvoice } from "@/features/settings/api/business-billing.api";

const PAGE_LIMIT = 25;

function truncateInvoiceId(id: string): string {
  if (id.length <= 16) return id;
  return `${id.slice(0, 14)}…`;
}

function formatInvoiceDateTime(value?: string | null): string {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { dateStyle: "medium" });
  }
  return formatPaymentDate(value);
}

function canViewStripeInvoice(invoice: BusinessBillingInvoice): boolean {
  return (
    invoice.billingSource === "STRIPE" &&
    Boolean(invoice.stripeHostedInvoiceUrl?.trim())
  );
}

export interface BillingInvoicesTableProps {
  invoices: BusinessBillingInvoice[];
  isLoading?: boolean;
  isActiveStripeSubscription?: boolean;
  showPlanColumns?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

export function BillingInvoicesTable({
  invoices,
  isLoading = false,
  isActiveStripeSubscription = false,
  showPlanColumns = false,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
}: BillingInvoicesTableProps) {
  const columns = useMemo<DataTableColumn<BusinessBillingInvoice>[]>(
    () => [
      {
        id: "invoiceId",
        header: "Invoice ID",
        cell: (row) => (
          <span
            className="block max-w-[140px] truncate font-mono text-xs"
            title={row.id}
          >
            {truncateInvoiceId(row.id)}
          </span>
        ),
      },
      {
        id: "dateTime",
        header: "Date time",
        sortable: true,
        sortValue: (row) => row.date,
        cell: (row) => (
          <span className="whitespace-nowrap">
            {formatInvoiceDateTime(row.date)}
          </span>
        ),
      },
      ...(showPlanColumns
        ? ([
            {
              id: "planGroup",
              header: "Plan group",
              cell: (row) => (
                <span className="max-w-[160px] truncate block">
                  {row.planGroupName ?? "—"}
                </span>
              ),
            },
            {
              id: "planTier",
              header: "Plan tier",
              cell: (row) => (
                <span className="max-w-[140px] truncate block">
                  {row.planTierName ?? "—"}
                </span>
              ),
            },
          ] satisfies DataTableColumn<BusinessBillingInvoice>[])
        : []),
      {
        id: "description",
        header: "Description",
        cell: (row) => (
          <span className="max-w-[220px] truncate block">
            {row.description ?? "—"}
          </span>
        ),
      },
      {
        id: "amount",
        header: "Amount",
        sortable: true,
        sortValue: (row) => Number(row.amount),
        cell: (row) => (
          <span className="font-medium">
            {row.amount} {row.currency}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <StatusBadge status={row.status} domain="subscriptionPayment" />
        ),
      },
    ],
    [showPlanColumns],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={invoices}
        getRowId={(row) => row.id}
        isLoading={isLoading && invoices.length === 0}
        emptyTitle={
          isActiveStripeSubscription
            ? "No subscription invoices yet."
            : "No invoices yet"
        }
        emptyDescription={
          isActiveStripeSubscription
            ? "Stripe subscription invoices will appear here after your first billing cycle."
            : "Subscription invoices and payment records will appear here."
        }
        rowActions={(invoice) =>
          canViewStripeInvoice(invoice) ? (
            <ActionButton
              size="sm"
              variant="ghost"
              onClick={() => {
                window.open(
                  invoice.stripeHostedInvoiceUrl!,
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
            >
              <ExternalLink className="mr-2 size-4" />
              View invoice
            </ActionButton>
          ) : null
        }
        actionsColumnHeader="Action"
      />

      {hasNextPage ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isFetchingNextPage}
            onClick={() => onLoadMore?.()}
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </>
  );
}

export { PAGE_LIMIT as BILLING_INVOICES_PAGE_LIMIT };
