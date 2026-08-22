"use client";

import { Plus } from "lucide-react";
import { MobileEntityList } from "@/components/mobile/mobile-entity-list";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Button } from "@/components/ui/button";
import type { Estimate } from "@/features/estimates/types";
import { getEstimateQuoteName } from "@/features/payments/utils/financial-table-display";
import {
  formatMoney,
  formatSalesListDateSafe,
} from "@/features/payments/utils/transaction-mobile-format";

export interface EstimatesMobileListProps {
  estimates: Estimate[];
  isLoading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  selectedId: string | null;
  onSelect: (estimate: Estimate) => void;
  onCreate: () => void;
  pagination?: {
    meta: { total: number; page: number; limit: number };
    page: number;
    onPageChange: (page: number) => void;
  };
}

export function EstimatesMobileList({
  estimates,
  isLoading = false,
  search,
  onSearchChange,
  selectedId,
  onSelect,
  onCreate,
  pagination,
}: EstimatesMobileListProps) {
  return (
    <MobileEntityList
      title="Estimates"
      items={estimates}
      getId={(row) => row.id}
      getRow={(row) => {
        const amount = formatMoney(row.totalAmount);
        const name = getEstimateQuoteName(row);
        const contact = row.contact?.label?.trim() || "—";
        const date = formatSalesListDateSafe(row.issueDate);
        return {
          primary: name,
          meta: `${row.estimateNumber} · ${contact} · ${date}`,
          amount,
          status: <StatusBadge status={row.status} domain="estimate" />,
          ariaLabel: `${name}, ${amount}`,
        };
      }}
      selectedId={selectedId}
      onSelect={onSelect}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search estimates…"
      showFilter={false}
      onCreate={onCreate}
      createLabel="New estimate"
      canCreate
      isLoading={isLoading}
      loadingMessage="Loading estimates…"
      emptyTitle="No estimates yet"
      emptyDescription="Create your first quote for a customer."
      emptyAction={
        <Button size="sm" onClick={onCreate}>
          <Plus className="mr-1.5 size-4" />
          New estimate
        </Button>
      }
      pagination={
        pagination && estimates.length > 0
          ? { ...pagination, label: "estimates" }
          : undefined
      }
    />
  );
}
