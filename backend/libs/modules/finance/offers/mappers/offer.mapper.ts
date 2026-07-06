import type {
  OfferDetailRow,
  OfferListRow,
} from '../repositories/offer.repository';
import type { OfferDateRule } from '../types/offer.types';
import type {
  OfferDiscountResponseDto,
  OfferResponseDto,
} from '../dto/offer.dto';
import { buildDiscountSummary } from '../utils/discount-summary.util';
import { parseOfferDateRules } from '../utils/offer-date-rules.util';

function parseStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((item): item is string => typeof item === 'string');
}

function toDiscountResponse(
  discount: OfferDetailRow['discounts'][number],
): OfferDiscountResponseDto {
  const { summary, subtext } = buildDiscountSummary(discount);
  return {
    id: discount.id,
    appliesTo: discount.appliesTo,
    amountType: discount.amountType,
    amount: discount.amount.toString(),
    serviceScope: discount.serviceScope,
    productScope: discount.productScope,
    specificServiceCategoryIds:
      parseStringArray(discount.specificServiceCategoryIds) ?? undefined,
    specificServiceIds:
      parseStringArray(discount.specificServiceIds) ?? undefined,
    specificProductCategoryIds:
      parseStringArray(discount.specificProductCategoryIds) ?? undefined,
    specificProductIds:
      parseStringArray(discount.specificProductIds) ?? undefined,
    sortOrder: discount.sortOrder,
    summary,
    subtext,
  };
}

function baseOfferFields(row: OfferDetailRow | OfferListRow): OfferResponseDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isEnabled: row.isEnabled,
    sortOrder: row.sortOrder,
    applicationMode: row.applicationMode,
    offerCode: row.offerCode,
    autoApptDateEnabled: row.autoApptDateEnabled,
    autoApptDateRules: parseOfferDateRules(row.autoApptDateRules),
    autoBookingDateEnabled: row.autoBookingDateEnabled,
    autoBookingDateRules: parseOfferDateRules(row.autoBookingDateRules),
    autoSaleDateEnabled: row.autoSaleDateEnabled,
    autoSaleDateRules: parseOfferDateRules(row.autoSaleDateRules),
    minAmountEnabled: row.minAmountEnabled,
    minAmount: row.minAmount?.toString() ?? null,
    oncePerClient: row.oncePerClient,
    newClientsOnly: row.newClientsOnly,
    membershipRequired: row.membershipRequired,
    membershipScope: row.membershipScope,
    specificMembershipPlanIds: parseStringArray(row.specificMembershipPlanIds),
    specificProvidersEnabled: row.specificProvidersEnabled,
    specificProviderIds: parseStringArray(row.specificProviderIds),
    commissionBasis: row.commissionBasis,
    discounts: row.discounts.map(toDiscountResponse),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toOfferResponse(row: OfferDetailRow): OfferResponseDto {
  return baseOfferFields(row);
}

export function toOfferListItem(row: OfferListRow): OfferResponseDto {
  const base = baseOfferFields(row);
  return {
    ...base,
    discountCount: row._count.discounts,
    usageCount: row._count.usageLog,
  };
}

export function serializeOfferDateRules(
  rules?: OfferDateRule[] | null,
): OfferDateRule[] | null {
  if (!rules?.length) return null;
  return rules;
}
