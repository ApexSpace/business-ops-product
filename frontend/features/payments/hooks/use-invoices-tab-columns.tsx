"use client";

import { useMemo } from "react";
import type { DataTableColumn } from "@/components/data-display/data-table";
import { StatusBadge } from "@/components/data-display/status-badge";
import { getInvoiceDisplayName } from "@/features/payments/utils/financial-table-display";
import {
  formatInvoiceDate,
  formatMoney,
} from "@/features/invoices/schemas/invoice-profile";
import type { Invoice } from "@/features/invoices/types";

export function useInvoicesTabColumns(): DataTableColumn<Invoice>[] {
  return useMemo<DataTableColumn<Invoice>[]>(
    () => [
      {
        id: "invoiceName",
        header: "Invoice Name",
        className: "min-w-[10rem] max-w-[14rem]",
        cell: (row) => (
          <span className="line-clamp-2 font-medium text-foreground">
            {getInvoiceDisplayName(row)}
          </span>
        ),
      },
      {
        id: "invoiceNumber",
        header: "Invoice Number",
        className: "whitespace-nowrap",
        cell: (row) => (
          <span className="tabular-nums text-muted-foreground">
            {row.invoiceNumber}
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
          <span className="tabular-nums">{formatInvoiceDate(row.issueDate)}</span>
        ),
      },
      {
        id: "amount",
        header: "Amount",
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
          <StatusBadge status={row.status} domain="invoice" />
        ),
      },
    ],
    [],
  );
}
