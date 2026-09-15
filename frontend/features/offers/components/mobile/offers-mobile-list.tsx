"use client";

import { MobileEntityList } from "@/components/mobile/mobile-entity-list";
import { StatusPill } from "@/components/data-display/status-pill";
import { ListPrimaryAction } from "@/components/layout/list-primary-action";
import type { Offer } from "@/features/offers/types";
import {
  applicationModeLabel,
} from "@/features/offers/utils/offer-workspace-utils";

export interface OffersMobileListProps {
  offers: Offer[];
  isLoading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  selectedId: string | null;
  onSelect: (offer: Offer) => void;
  onCreate?: () => void;
  canCreate?: boolean;
  pagination?: {
    meta: { total: number; page: number; limit: number,
};
    page: number;
    onPageChange: (page: number) => void;
  };
}

export function OffersMobileList({
  offers,
  isLoading = false,
  search,
  onSearchChange,
  selectedId,
  onSelect,
  onCreate,
  canCreate = false,
  pagination,
}: OffersMobileListProps) {
  return (
    <MobileEntityList
      title="Offers"
      items={offers}
      getId={(row) => row.id}
      getRow={(row) => {
        const count = row.discountCount ?? row.discounts?.length ?? 0;
        return {
          primary: row.name,
          meta: applicationModeLabel(row.applicationMode, row.offerCode),
          amount: `${count} discount${count === 1 ? "" : "s"}`,
          status: (
            <StatusPill
              label={row.isEnabled ? "Enabled" : "Disabled"}
              variant={row.isEnabled ? "success" : "neutral"}
            />
          ),
          ariaLabel: row.name,
        };
      }}
      selectedId={selectedId}
      onSelect={onSelect}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search offers…"
      showFilter={false}
      onCreate={onCreate}
      createLabel="Create offer"
      canCreate={canCreate}
      isLoading={isLoading}
      loadingMessage="Loading offers…"
      emptyTitle="No offers yet"
      emptyDescription="Create a promotional offer to get started."
      emptyAction={
        canCreate && onCreate ? (
          <ListPrimaryAction
            label="Create offer"
            showIcon={false}
            onClick={onCreate}
          />
        ) : null
      }
      pagination={
        pagination && offers.length > 0
          ? { ...pagination, label: "offers",
}
          : undefined
      }
    />
  );
}
