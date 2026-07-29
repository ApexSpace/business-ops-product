import { api } from "@/lib/api/client";
import type {
  CreateGiftCardManualInput,
  GiftCardDetail,
  GiftCardListItem,
  GiftCardOnlineSalesShare,
  GiftCardPromotion,
  GiftCardSettings,
  GiftCardsListFilters,
} from "@/features/gift-cards/types";

export function listGiftCards(filters: GiftCardsListFilters = {}) {
  return api.getPaginated<GiftCardListItem>("gift-cards", {
    searchParams: filters,
  });
}

export function getGiftCard(id: string) {
  return api.get<GiftCardDetail>(`gift-cards/${id}`);
}

export function createGiftCardManual(body: CreateGiftCardManualInput) {
  return api.post<GiftCardDetail>("gift-cards", body);
}

export function updateGiftCard(
  id: string,
  body: { ownerContactId?: string; notes?: string },
) {
  return api.patch<GiftCardDetail>(`gift-cards/${id}`, body);
}

export function adjustGiftCardBalance(
  id: string,
  body: { amount: number; note: string },
) {
  return api.post<GiftCardDetail>(`gift-cards/${id}/adjust-balance`, body);
}

export function voidGiftCard(id: string) {
  return api.post<GiftCardDetail>(`gift-cards/${id}/void`);
}

export function sendDigitalGiftCard(id: string) {
  return api.post<{ sent: boolean }>(`gift-cards/${id}/send-digital`);
}

export function previewGiftCardNumber() {
  return api.get<{ number: string | null }>("gift-cards/preview-number");
}

export function getGiftCardOnlineSalesShare() {
  return api.get<GiftCardOnlineSalesShare>("gift-cards/settings/online-sales-share");
}

export function getGiftCardSettings() {
  return api.get<GiftCardSettings>("gift-cards/settings");
}

export function updateGiftCardOnlineSales(body: {
  enabled: boolean;
  purchaseDisclaimer?: string;
  internalNotifyEmail?: string;
}) {
  return api.patch<GiftCardSettings>("gift-cards/settings/online-sales", {
    enabled: body.enabled,
    purchaseDisclaimer: body.purchaseDisclaimer,
    internalNotifyEmail: body.internalNotifyEmail,
  });
}

export function updateGiftCardArtwork(artworkKey: string) {
  return api.patch<GiftCardSettings>("gift-cards/settings/artwork", {
    artworkKey,
  });
}

export function updateGiftCardPreferences(autoGenerateNumber: boolean) {
  return api.patch<GiftCardSettings>("gift-cards/settings/preferences", {
    autoGenerateNumber,
  });
}

export function listGiftCardPromotions() {
  return api.get<GiftCardPromotion[]>("gift-cards/promotions");
}

export function createGiftCardPromotion(body: Record<string, unknown>) {
  return api.post<GiftCardPromotion>("gift-cards/promotions", body);
}

export function updateGiftCardPromotion(
  id: string,
  body: Record<string, unknown>,
) {
  return api.patch<GiftCardPromotion>(`gift-cards/promotions/${id}`, body);
}

export function deleteGiftCardPromotion(id: string) {
  return api.delete(`gift-cards/promotions/${id}`);
}

export function reorderGiftCardPromotions(orderedIds: string[]) {
  return api.post<GiftCardPromotion[]>("gift-cards/promotions/reorder", {
    orderedIds,
  });
}

export function listContactGiftCards(contactId: string) {
  return api.get<GiftCardListItem[]>(`contacts/${contactId}/gift-cards`);
}

export function getPublicGiftCardPage(slug: string) {
  return api.get<{
    business: { id: string; name: string; logoUrl: string | null };
    settings: {
      disclaimer?: string | null;
      artworkUrl?: string | null;
      minAmount?: number;
      maxAmount?: number;
    };
    activePromotions: GiftCardPromotion[];
    stripeReady: boolean;
  }>(`public/gift-cards/${slug}`);
}

export function createPublicGiftCardCheckout(
  slug: string,
  body: Record<string, unknown>,
) {
  return api.post<{
    clientSecret: string;
    publishableKey: string | null;
    stripeAccountId: string;
    salePrice: string;
    cardValue: string;
  }>(`public/gift-cards/${slug}/checkout`, body);
}
