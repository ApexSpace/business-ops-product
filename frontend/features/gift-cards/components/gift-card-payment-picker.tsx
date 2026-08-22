"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ScanLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/features/payments/schemas/payment-profile";
import {
  listContactGiftCards,
  listGiftCards,
} from "@/features/gift-cards/api/gift-cards.api";
import { queryKeys } from "@/lib/query/keys";
import type { GiftCardListItem } from "@/features/gift-cards/types";
import {
  SALES_DRAWER_FIELD_CLASS,
  SALES_DRAWER_VIEW_FIELD_LABEL_CLASS,
} from "@/features/sales/styles/sales-drawer-tokens";
import { cn } from "@/lib/utils";

export interface GiftCardPaymentPickerProps {
  contactId: string;
  balanceDue: number;
  selectedCardId: string | null;
  onSelectCard: (cardId: string | null, card: GiftCardListItem | null) => void;
  amount: number;
  onAmountChange: (amount: number) => void;
}

function isRedeemable(card: GiftCardListItem): boolean {
  return card.status === "ACTIVE" && parseFloat(card.currentBalance) > 0;
}

function GiftCardOptionRow({
  card,
  selected,
  onSelect,
}: {
  card: GiftCardListItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={
        selected
          ? `Deselect gift card ${card.number}`
          : `Select gift card ${card.number}`
      }
      className={cn(
        "flex w-full min-w-0 items-start gap-3 rounded-[var(--radius-md)] border px-3 py-3 text-left transition-colors",
        selected
          ? "border-violet-primary-normal bg-violet-primary-surface"
          : "border-[#E8E4DC] bg-white hover:border-violet-primary-normal/40",
      )}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border",
          selected
            ? "border-violet-primary-normal bg-violet-primary-normal text-white"
            : "border-[#C8C4BE] bg-white text-transparent",
        )}
        aria-hidden
      >
        <Check className="size-3 stroke-[3]" />
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block truncate text-[14px] font-bold tabular-nums leading-none text-violet-primary-darker">
          #{card.number}
        </span>
        <span className="block truncate text-[13px] font-medium leading-snug text-[#524346]">
          {card.ownerContact.name}
        </span>
        <span className="block text-[12px] font-medium leading-none text-[#8A8A8A]">
          Balance {formatMoney(card.currentBalance)}
        </span>
      </span>
    </button>
  );
}

export function GiftCardPaymentPicker({
  contactId,
  balanceDue,
  selectedCardId,
  onSelectCard,
  amount,
  onAmountChange,
}: GiftCardPaymentPickerProps) {
  const [search, setSearch] = useState("");

  const contactCardsQuery = useQuery({
    queryKey: queryKeys.giftCards.contact(contactId),
    queryFn: () => listContactGiftCards(contactId),
  });

  const searchQuery = useQuery({
    queryKey: queryKeys.giftCards.list({
      search: search.trim(),
      redeemableOnly: true,
    }),
    queryFn: () =>
      listGiftCards({ search: search.trim(), limit: 20, redeemableOnly: true }),
    enabled: search.trim().length >= 2,
  });

  const contactCards = useMemo(
    () => (contactCardsQuery.data ?? []).filter(isRedeemable),
    [contactCardsQuery.data],
  );

  const searchCards = useMemo(() => {
    const items = searchQuery.data?.items ?? [];
    return items.filter(isRedeemable);
  }, [searchQuery.data]);

  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    return (
      contactCards.find((c) => c.id === selectedCardId) ??
      searchCards.find((c) => c.id === selectedCardId) ??
      null
    );
  }, [selectedCardId, contactCards, searchCards]);

  const cardBalance = selectedCard
    ? parseFloat(selectedCard.currentBalance)
    : null;
  const maxApply =
    cardBalance != null ? Math.min(balanceDue, cardBalance) : balanceDue;

  const selectCard = (card: GiftCardListItem) => {
    if (selectedCardId === card.id) {
      onSelectCard(null, null);
      onAmountChange(0);
      return;
    }
    onSelectCard(card.id, card);
    onAmountChange(Math.min(balanceDue, parseFloat(card.currentBalance)));
  };

  const listCards = useMemo(() => {
    const byId = new Map<string, GiftCardListItem>();
    for (const card of contactCards) byId.set(card.id, card);
    for (const card of searchCards) byId.set(card.id, card);
    return Array.from(byId.values());
  }, [contactCards, searchCards]);

  const showingSearchResults = search.trim().length >= 2;

  return (
    <div className="space-y-4 rounded-[var(--radius-xl)] border border-[#E8E4DC] bg-white p-4">
      <div className="space-y-1">
        <p className="text-[13px] font-semibold leading-none text-violet-primary-darker">
          Gift card
        </p>
        <p className="text-[12px] font-medium leading-snug text-[#8A8A8A]">
          {contactCards.length > 0
            ? `${contactCards.length} active card${contactCards.length === 1 ? "" : "s"} for this client`
            : "Search or scan a gift card to apply"}
        </p>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="gift-card-search"
          className={SALES_DRAWER_VIEW_FIELD_LABEL_CLASS}
        >
          Search by number or client
        </Label>
        <div className="relative">
          <ScanLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8A8A8A]" />
          <Input
            id="gift-card-search"
            className={cn(SALES_DRAWER_FIELD_CLASS, "pl-9")}
            placeholder="Type 2+ characters or scan barcode"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchCards.length === 1) {
                selectCard(searchCards[0]!);
              }
            }}
          />
        </div>
      </div>

      {listCards.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8A8A8A]">
            {showingSearchResults ? "Search results" : "Available cards"}
          </p>
          <div className="max-h-52 space-y-2 overflow-y-auto pr-0.5">
            {listCards.map((card) => (
              <GiftCardOptionRow
                key={card.id}
                card={card}
                selected={selectedCardId === card.id}
                onSelect={() => selectCard(card)}
              />
            ))}
          </div>
        </div>
      ) : showingSearchResults && !searchQuery.isFetching ? (
        <p className="rounded-[var(--radius-md)] border border-dashed border-[#E8E4DC] bg-[#FAFAF8] px-3 py-4 text-center text-[13px] font-medium text-[#8A8A8A]">
          No redeemable gift cards found.
        </p>
      ) : null}

      {selectedCard ? (
        <div className="space-y-3 rounded-[10px] border border-violet-primary-normal/25 bg-violet-primary-surface/70 p-3.5">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8A8A8A]">
              Selected card
            </p>
            <p className="text-[16px] font-bold tabular-nums leading-none text-violet-primary-darker">
              #{selectedCard.number}
            </p>
            <p className="text-[13px] font-medium leading-snug text-[#524346]">
              {selectedCard.ownerContact.name}
            </p>
            <div className="flex items-center justify-between gap-3 pt-1 text-[13px] font-medium">
              <span className="text-[#8A8A8A]">Available balance</span>
              <span className="tabular-nums text-violet-primary-darker">
                {formatMoney(selectedCard.currentBalance)}
              </span>
            </div>
          </div>

          <div className="space-y-2 border-t border-violet-primary-normal/15 pt-3">
            <Label
              htmlFor="gift-card-apply-amount"
              className={SALES_DRAWER_VIEW_FIELD_LABEL_CLASS}
            >
              Amount to apply
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[14px] font-semibold text-[#8A8A8A]">
                $
              </span>
              <Input
                id="gift-card-apply-amount"
                type="number"
                step="0.01"
                min={0.01}
                max={maxApply}
                value={amount || ""}
                onChange={(e) => {
                  const next = parseFloat(e.target.value) || 0;
                  onAmountChange(Math.min(next, maxApply));
                }}
                className={cn(SALES_DRAWER_FIELD_CLASS, "pl-7")}
              />
            </div>
            <p className="text-[12px] font-medium text-[#8A8A8A]">
              Max for this sale: {formatMoney(maxApply)}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
