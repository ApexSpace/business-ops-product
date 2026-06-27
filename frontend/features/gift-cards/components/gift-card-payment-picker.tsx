"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScanLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { formatMoney } from "@/features/payments/schemas/payment-profile";
import { listContactGiftCards, listGiftCards } from "@/features/gift-cards/api/gift-cards.api";
import { queryKeys } from "@/lib/query/keys";
import type { GiftCardListItem } from "@/features/gift-cards/types";

export interface GiftCardPaymentPickerProps {
  contactId: string;
  balanceDue: number;
  selectedCardId: string | null;
  onSelectCard: (cardId: string | null, card: GiftCardListItem | null) => void;
  amount: number;
  onAmountChange: (amount: number) => void;
}

function isRedeemable(card: GiftCardListItem): boolean {
  return (
    card.status === "ACTIVE" && parseFloat(card.currentBalance) > 0
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
    cardBalance != null
      ? Math.min(balanceDue, cardBalance)
      : balanceDue;

  const pickerItems = useMemo(() => {
    const byId = new Map<string, GiftCardListItem>();
    for (const card of contactCards) byId.set(card.id, card);
    for (const card of searchCards) byId.set(card.id, card);
    return Array.from(byId.values()).map((card) => ({
      value: card.id,
      label: `#${card.number} — ${card.ownerContact.name} (${formatMoney(card.currentBalance)})`,
    }));
  }, [contactCards, searchCards]);

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      {contactCards.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {contactCards.length} active card
          {contactCards.length === 1 ? "" : "s"} for this client
        </p>
      ) : null}

      <div className="space-y-2">
        <Label>Gift card</Label>
        <SearchableSelect
          inDialog
          items={pickerItems}
          value={selectedCardId}
          onValueChange={(id) => {
            const card =
              contactCards.find((c) => c.id === id) ??
              searchCards.find((c) => c.id === id) ??
              null;
            onSelectCard(id, card);
            if (card) {
              const bal = parseFloat(card.currentBalance);
              onAmountChange(Math.min(balanceDue, bal));
            }
          }}
          placeholder="Select a gift card"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="gift-card-search">Search by number or client</Label>
        <div className="relative">
          <ScanLine className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            id="gift-card-search"
            className="pl-8"
            placeholder="Or scan barcode"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchCards.length === 1) {
                const card = searchCards[0]!;
                onSelectCard(card.id, card);
                onAmountChange(
                  Math.min(balanceDue, parseFloat(card.currentBalance)),
                );
              }
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Focus this field and scan a barcode, or type at least 2 characters.
        </p>
      </div>

      {selectedCard ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Card balance: {formatMoney(selectedCard.currentBalance)}
          </p>
          <Label>Amount to apply</Label>
          <Input
            type="number"
            step="0.01"
            min={0.01}
            max={maxApply}
            value={amount || ""}
            onChange={(e) => {
              const next = parseFloat(e.target.value) || 0;
              onAmountChange(Math.min(next, maxApply));
            }}
          />
          <p className="text-xs text-muted-foreground">
            Maximum {formatMoney(maxApply)} for this card on this sale.
          </p>
        </div>
      ) : null}
    </div>
  );
}
