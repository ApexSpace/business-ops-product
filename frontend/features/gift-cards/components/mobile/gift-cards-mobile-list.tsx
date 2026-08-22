"use client";

import { MobileEntityList } from "@/components/mobile/mobile-entity-list";
import { ListPrimaryAction } from "@/components/layout/list-primary-action";
import { GiftCardStatusBadge } from "@/features/gift-cards/components/gift-card-visual";
import type { GiftCardListItem } from "@/features/gift-cards/types";
import { formatMoney } from "@/features/payments/schemas/payment-profile";

export interface GiftCardsMobileListProps {
  cards: GiftCardListItem[];
  isLoading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  selectedId: string | null;
  onSelect: (card: GiftCardListItem) => void;
  onCreate?: () => void;
  canCreate?: boolean;
  pagination?: {
    meta: { total: number; page: number; limit: number };
    page: number;
    onPageChange: (page: number) => void;
  };
}

export function GiftCardsMobileList({
  cards,
  isLoading = false,
  search,
  onSearchChange,
  selectedId,
  onSelect,
  onCreate,
  canCreate = false,
  pagination,
}: GiftCardsMobileListProps) {
  return (
    <MobileEntityList
      title="Gift cards"
      items={cards}
      getId={(card) => card.id}
      getRow={(card) => {
        const amount = formatMoney(card.currentBalance);
        const number = `#${card.number.replace(/^#/, "")}`;
        const purchaser = card.purchasingContact?.name?.trim() || "—";
        return {
          primary: card.ownerContact.name,
          meta: `${number} · ${purchaser}`,
          amount,
          status: <GiftCardStatusBadge status={card.status} />,
          ariaLabel: `${card.ownerContact.name}, ${amount}`,
        };
      }}
      selectedId={selectedId}
      onSelect={onSelect}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search by number or client…"
      showFilter={false}
      onCreate={onCreate}
      createLabel="New gift card"
      canCreate={canCreate}
      isLoading={isLoading}
      loadingMessage="Loading gift cards…"
      emptyTitle="No gift cards yet"
      emptyDescription="Create a gift card to get started."
      emptyAction={
        canCreate && onCreate ? (
          <ListPrimaryAction
            label="New Gift Card"
            showIcon={false}
            onClick={onCreate}
          />
        ) : null
      }
      pagination={
        pagination && cards.length > 0
          ? { ...pagination, label: "gift cards" }
          : undefined
      }
    />
  );
}
