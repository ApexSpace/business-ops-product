"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/data-display/data-table";
import type { Offer } from "@/features/offers/types";
import {
  applicationModeLabel,
  offerDiscountCount,
} from "@/features/offers/utils/offer-workspace-utils";

export function useOfferListColumns(): DataTableColumn<Offer>[] {
  return useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        sortable: true,
        sortValue: (row) => row.name,
        cell: (row) => <span className="font-medium">{row.name}</span>,
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (row) => (row.isEnabled ? 1 : 0),
        cell: (row) => (
          <Badge variant={row.isEnabled ? "success" : "neutral"}>
            {row.isEnabled ? "Enabled" : "Disabled"}
          </Badge>
        ),
      },
      {
        id: "application",
        header: "Application",
        sortable: true,
        sortValue: (row) => row.applicationMode,
        cell: (row) => (
          <span className="text-muted-foreground">
            {applicationModeLabel(row.applicationMode, row.offerCode)}
          </span>
        ),
      },
      {
        id: "discounts",
        header: "Discounts",
        sortable: true,
        sortValue: (row) => offerDiscountCount(row),
        className: "text-right",
        cell: (row) => (
          <span className="tabular-nums text-muted-foreground">
            {offerDiscountCount(row)}
          </span>
        ),
      },
    ],
    [],
  );
}
