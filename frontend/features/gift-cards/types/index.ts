export type GiftCardStatus = "ACTIVE" | "DEPLETED" | "VOIDED";
export type GiftCardSource = "MANUAL" | "POS_SALE" | "ONLINE_PURCHASE";
export type GiftCardTransactionType =
  | "INITIAL_VALUE"
  | "REDEMPTION"
  | "REFUND"
  | "ADJUSTMENT"
  | "VOID";

export interface GiftCardContactSummary {
  id: string;
  name: string;
  email?: string | null;
}

export interface GiftCardTransaction {
  id: string;
  type: GiftCardTransactionType;
  amount: string;
  note?: string | null;
  invoiceId?: string | null;
  createdAt: string;
}

export interface GiftCardListItem {
  id: string;
  number: string;
  currentBalance: string;
  initialValue: string;
  status: GiftCardStatus;
  source: GiftCardSource;
  ownerContact: GiftCardContactSummary;
  purchasingContact?: GiftCardContactSummary | null;
  createdAt: string;
}

export interface GiftCardDetail extends GiftCardListItem {
  notes?: string | null;
  promotionId?: string | null;
  promotionName?: string | null;
  invoiceId?: string | null;
  artworkUrl?: string | null;
  transactions: GiftCardTransaction[];
}

export interface GiftCardOnlineSalesShare {
  slug?: string | null;
  onlineSalesEnabled: boolean;
  stripeReady: boolean;
  hostedPageUrl?: string | null;
  embedUrl?: string | null;
  embedCode?: string | null;
  iframeEmbed?: string | null;
}

export interface GiftCardSettings {
  publicSlug?: string | null;
  onlineSalesEnabled: boolean;
  purchaseDisclaimer?: string | null;
  selectedArtworkKey?: string | null;
  artworkUrl?: string | null;
  autoGenerateNumber: boolean;
  internalNotifyEmail?: string | null;
  artworkPresets: { key: string; label: string; imageUrl: string }[];
}

export interface GiftCardPromotion {
  id: string;
  name: string;
  description?: string | null;
  cardValue: string;
  salePrice: string;
  startDate: string;
  endDate?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface CreateGiftCardManualInput {
  number?: string;
  initialValue: number;
  ownerContactId: string;
  purchasingContactId?: string;
  notes?: string;
}

export type GiftCardsListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  redeemableOnly?: boolean;
};
