"use client";

import { useMemo } from "react";
import type { DataTableColumn } from "@/components/data-display/data-table";
import { EstimateDueStatus } from "@/features/payments/components/financial-due-status";
import { getEstimateQuoteName } from "@/features/payments/utils/financial-table-display";
import {
  formatEstimateDate,
  formatMoney,
} from "@/features/estimates/schemas/estimate-profile";
import type { Estimate } from "@/features/estimates/types";

export function useEstimatesTabColumns(): DataTableColumn<Estimate>[] {
  return useMemo<DataTableColumn<Estimate>[]>(
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
        cell: (row) => <EstimateDueStatus estimate={row} />,
      },
    ],
    [],
  );
}
