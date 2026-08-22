"use client";

import { MobileEntityList } from "@/components/mobile/mobile-entity-list";
import { StatusPill } from "@/components/data-display/status-pill";
import { ListPrimaryAction } from "@/components/layout/list-primary-action";
import { formatMoney } from "@/features/payments/schemas/payment-profile";
import type { ProductListItem } from "@/features/products/types";

export interface ProductsMobileListProps {
  products: ProductListItem[];
  isLoading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  selectedId: string | null;
  onSelect: (row: ProductListItem) => void;
  onOpenOptions?: () => void;
  onCreate?: () => void;
  canCreate?: boolean;
  pagination?: {
    meta: { total: number; page: number; limit: number };
    page: number;
    onPageChange: (page: number) => void;
  };
}

export function ProductsMobileList({
  products,
  isLoading = false,
  search,
  onSearchChange,
  selectedId,
  onSelect,
  onOpenOptions,
  onCreate,
  canCreate = false,
  pagination,
}: ProductsMobileListProps) {
  return (
    <MobileEntityList
      title="Products"
      items={products}
      getId={(row) => row.id}
      getRow={(row) => {
        const amount = formatMoney(row.unitPrice);
        const archived = row.status === "ARCHIVED";
        return {
          primary: row.name,
          meta: row.categoryName?.trim() || "Uncategorized",
          amount,
          status: (
            <StatusPill
              label={archived ? "Archived" : "Active"}
              variant={archived ? "neutral" : "success"}
            />
          ),
          ariaLabel: `${row.name}, ${amount}`,
        };
      }}
      selectedId={selectedId}
      onSelect={onSelect}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search products…"
      onFilter={onOpenOptions}
      filterLabel="Product options"
      showFilter={Boolean(onOpenOptions)}
      onCreate={onCreate}
      createLabel="New product"
      canCreate={canCreate}
      isLoading={isLoading}
      loadingMessage="Loading products…"
      emptyTitle="No products yet"
      emptyDescription="Add your first product to get started."
      emptyAction={
        canCreate && onCreate ? (
          <ListPrimaryAction
            label="New Product"
            showIcon={false}
            onClick={onCreate}
          />
        ) : null
      }
      pagination={
        pagination && products.length > 0
          ? { ...pagination, label: "products" }
          : undefined
      }
    />
  );
}
