import type {
  GiftCardDetailRow,
  GiftCardListRow,
} from '../repositories/gift-card.repository';
import type {
  GiftCardContactSummaryDto,
  GiftCardDetailResponseDto,
  GiftCardListItemResponseDto,
  GiftCardPromotionResponseDto,
  GiftCardTransactionResponseDto,
} from '../dto/gift-card.dto';
import type { GiftCardPromotion, GiftCardSettings } from '@prisma/client';
import { GIFT_CARD_ARTWORK_PRESETS } from '../constants/artwork-presets';

function contactName(contact: {
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
}): string {
  if (contact.displayName?.trim()) return contact.displayName.trim();
  return (
    [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() ||
    'Unknown'
  );
}

function toContactSummary(contact: {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string | null;
}): GiftCardContactSummaryDto {
  return {
    id: contact.id,
    name: contactName(contact),
    email: contact.email,
  };
}

export function toGiftCardListItem(
  row: GiftCardListRow,
): GiftCardListItemResponseDto {
  return {
    id: row.id,
    number: row.number,
    currentBalance: row.currentBalance.toFixed(2),
    initialValue: row.initialValue.toFixed(2),
    status: row.status,
    source: row.source,
    ownerContact: toContactSummary(row.ownerContact),
    purchasingContact: row.purchasingContact
      ? toContactSummary(row.purchasingContact)
      : null,
    createdAt: row.createdAt,
  };
}

export function toGiftCardDetail(
  row: GiftCardDetailRow,
): GiftCardDetailResponseDto {
  return {
    ...toGiftCardListItem(row),
    notes: row.notes,
    promotionId: row.promotionId,
    promotionName: row.promotion?.name ?? null,
    invoiceId: row.invoiceId,
    artworkUrl: row.artworkUrl,
    transactions: row.transactions.map(toGiftCardTransaction),
  };
}

export function toGiftCardTransaction(row: {
  id: string;
  type: GiftCardTransactionResponseDto['type'];
  amount: { toFixed: (n: number) => string };
  note: string | null;
  invoiceId: string | null;
  createdAt: Date;
}): GiftCardTransactionResponseDto {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount.toFixed(2),
    note: row.note,
    invoiceId: row.invoiceId,
    createdAt: row.createdAt,
  };
}

export function toGiftCardPromotion(
  row: GiftCardPromotion,
): GiftCardPromotionResponseDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    cardValue: row.cardValue.toFixed(2),
    salePrice: row.salePrice.toFixed(2),
    startDate: row.startDate,
    endDate: row.endDate,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
  };
}

export function toGiftCardSettings(row: GiftCardSettings) {
  return {
    publicSlug: row.publicSlug,
    onlineSalesEnabled: row.onlineSalesEnabled,
    purchaseDisclaimer: row.purchaseDisclaimer,
    selectedArtworkKey: row.selectedArtworkKey,
    autoGenerateNumber: row.autoGenerateNumber,
    internalNotifyEmail: row.internalNotifyEmail,
    artworkPresets: GIFT_CARD_ARTWORK_PRESETS.map((p) => ({
      key: p.key,
      label: p.label,
    })),
  };
}
