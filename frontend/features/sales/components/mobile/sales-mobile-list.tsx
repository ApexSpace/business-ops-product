"use client";

import { MobileEntityListItem } from "@/components/mobile/mobile-entity-list-item";
import { MobileEntityListScreen } from "@/components/mobile/mobile-entity-list-screen";
import { MobileStatusPill } from "@/components/mobile/mobile-status-pill";
import { ListPrimaryAction } from "@/components/layout/list-primary-action";
import { MobileAppBottomNav } from "@/components/shell/mobile-app-bottom-nav";
import { formatMoney } from "@/features/payments/schemas/payment-profile";
import type { Checkout } from "@/features/sales/types/checkout";
import {
  formatSaleNumberDisplay,
  formatSalesListDate,
  saleStatusLabel,
  saleStatusTone,
} from "@/features/sales/utils/sales-list-format";

export interface SalesMobileListProps {
  sales: Checkout[];
  isLoading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  selectedId: string | null;
  onSelect: (sale: Checkout) => void;
  onOpenOptions: () => void;
  onCreate: () => void;
  canCreate?: boolean;
  emptyAction?: React.ReactNode;
  pagination?: {
    meta: { total: number; page: number; limit: number };
    page: number;
    onPageChange: (page: number) => void;
  };
  className?: string;
}

export function SalesMobileList({
  sales,
  isLoading = false,
  search,
  onSearchChange,
  selectedId,
  onSelect,
  onOpenOptions,
  onCreate,
  canCreate = true,
  emptyAction,
  pagination,
  className,
}: SalesMobileListProps) {
  return (
    <MobileEntityListScreen
      title="Sales"
      search={search}
      onSearchChange={onSearchChange}
      onFilter={onOpenOptions}
      filterLabel="Sale options"
      onCreate={onCreate}
      createLabel="New checkout"
      canCreate={canCreate}
      isLoading={isLoading}
      isEmpty={sales.length === 0}
      loadingMessage="Loading sales…"
      emptyTitle="No sales yet"
      emptyDescription="Create a new checkout to get started."
      emptyAction={
        emptyAction ??
        (canCreate ? (
          <ListPrimaryAction
            label="New Checkout"
            showIcon={false}
            onClick={onCreate}
          />
        ) : null)
      }
      pagination={
        pagination && sales.length > 0
          ? {
              meta: pagination.meta,
              page: pagination.page,
              onPageChange: pagination.onPageChange,
              label: "sales",
            }
          : undefined
      }
      bottomNav={<MobileAppBottomNav />}
      className={className}
    >
      <ul className="m-0 list-none p-0">
        {sales.map((sale) => {
          const number = formatSaleNumberDisplay(sale.saleNumber);
          const date = formatSalesListDate(sale.issueDate);
          const label = saleStatusLabel(sale);
          const tone = saleStatusTone(sale);
          return (
            <li key={sale.id}>
              <MobileEntityListItem
                primary={sale.contact?.label ?? "Client"}
                meta={`${number} · ${date}`}
                amount={formatMoney(parseFloat(sale.totalAmount))}
                status={<MobileStatusPill label={label} tone={tone} />}
                active={selectedId === sale.id}
                onClick={() => onSelect(sale)}
                aria-label={`${sale.contact?.label ?? "Client"}, ${label}, ${formatMoney(parseFloat(sale.totalAmount))}`}
              />
            </li>
          );
        })}
      </ul>
    </MobileEntityListScreen>
  );
}
