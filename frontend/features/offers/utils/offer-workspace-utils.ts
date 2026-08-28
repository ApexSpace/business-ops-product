import type {
  CreateOfferDiscountInput,
  DiscountAppliesTo,
  DiscountAmountType,
  DiscountScope,
  Offer,
  OfferApplicationMode,
  OfferDiscount,
  OfferMembershipScope,
  UpdateOfferDetailsInput,
} from "@/features/offers/types";

export type OfferTabId = "details" | "discounts" | "advanced";

export const OFFER_DETAIL_TABS: Array<{ value: OfferTabId; label: string }> = [
  { value: "details", label: "Details" },
  { value: "discounts", label: "Discounts" },
  { value: "advanced", label: "Advanced" },
];

export type DiscountFormState = {
  appliesTo: DiscountAppliesTo;
  amountType: DiscountAmountType;
  amount: string;
  serviceScope: DiscountScope;
  productScope: DiscountScope;
  specificServiceCategoryIds: string[];
  specificServiceIds: string[];
  specificProductCategoryIds: string[];
  specificProductIds: string[];
};

export function emptyDiscountForm(): DiscountFormState {
  return {
    appliesTo: "SERVICES",
    amountType: "PERCENTAGE",
    amount: "",
    serviceScope: "ALL",
    productScope: "ALL",
    specificServiceCategoryIds: [],
    specificServiceIds: [],
    specificProductCategoryIds: [],
    specificProductIds: [],
  };
}

export function discountToForm(discount: OfferDiscount): DiscountFormState {
  return {
    appliesTo: discount.appliesTo,
    amountType: discount.amountType,
    amount: discount.amount,
    serviceScope: discount.serviceScope,
    productScope: discount.productScope,
    specificServiceCategoryIds: discount.specificServiceCategoryIds ?? [],
    specificServiceIds: discount.specificServiceIds ?? [],
    specificProductCategoryIds: discount.specificProductCategoryIds ?? [],
    specificProductIds: discount.specificProductIds ?? [],
  };
}

export function discountFormToInput(
  form: DiscountFormState,
): CreateOfferDiscountInput {
  return {
    appliesTo: form.appliesTo,
    amountType: form.appliesTo === "ENTIRE_SALE" ? "FIXED" : form.amountType,
    amount: Number(form.amount),
    serviceScope: form.appliesTo === "SERVICES" ? form.serviceScope : undefined,
    productScope: form.appliesTo === "PRODUCTS" ? form.productScope : undefined,
    specificServiceCategoryIds:
      form.appliesTo === "SERVICES" &&
      form.serviceScope === "SPECIFIC" &&
      form.specificServiceCategoryIds.length
        ? form.specificServiceCategoryIds
        : undefined,
    specificServiceIds:
      form.appliesTo === "SERVICES" &&
      form.serviceScope === "SPECIFIC" &&
      form.specificServiceIds.length
        ? form.specificServiceIds
        : undefined,
    specificProductCategoryIds:
      form.appliesTo === "PRODUCTS" &&
      form.productScope === "SPECIFIC" &&
      form.specificProductCategoryIds.length
        ? form.specificProductCategoryIds
        : undefined,
    specificProductIds:
      form.appliesTo === "PRODUCTS" &&
      form.productScope === "SPECIFIC" &&
      form.specificProductIds.length
        ? form.specificProductIds
        : undefined,
  };
}

export function isDiscountFormValid(form: DiscountFormState): boolean {
  const amount = Number(form.amount);
  if (!form.amount.trim() || Number.isNaN(amount) || amount <= 0) return false;
  if (form.appliesTo === "ENTIRE_SALE" && form.amountType === "PERCENTAGE") {
    return false;
  }
  if (
    form.appliesTo === "SERVICES" &&
    form.serviceScope === "SPECIFIC" &&
    form.specificServiceCategoryIds.length === 0 &&
    form.specificServiceIds.length === 0
  ) {
    return false;
  }
  if (
    form.appliesTo === "PRODUCTS" &&
    form.productScope === "SPECIFIC" &&
    form.specificProductCategoryIds.length === 0 &&
    form.specificProductIds.length === 0
  ) {
    return false;
  }
  return true;
}

export function offerToUpdateInput(offer: Offer): UpdateOfferDetailsInput {
  return {
    name: offer.name,
    description: offer.description ?? undefined,
    applicationMode: offer.applicationMode,
    offerCode: offer.offerCode ?? undefined,
    autoApptDateEnabled: offer.autoApptDateEnabled,
    autoApptDateRules: offer.autoApptDateRules ?? undefined,
    autoBookingDateEnabled: offer.autoBookingDateEnabled,
    autoBookingDateRules: offer.autoBookingDateRules ?? undefined,
    autoSaleDateEnabled: offer.autoSaleDateEnabled,
    autoSaleDateRules: offer.autoSaleDateRules ?? undefined,
    minAmountEnabled: offer.minAmountEnabled,
    minAmount:
      offer.minAmount != null && offer.minAmount !== ""
        ? Number(offer.minAmount)
        : undefined,
    oncePerClient: offer.oncePerClient,
    newClientsOnly: offer.newClientsOnly,
    membershipRequired: offer.membershipRequired,
    membershipScope: offer.membershipScope ?? undefined,
    specificMembershipPlanIds: offer.specificMembershipPlanIds ?? undefined,
    specificProvidersEnabled: offer.specificProvidersEnabled,
    specificProviderIds: offer.specificProviderIds ?? undefined,
    commissionBasis: offer.commissionBasis,
  };
}

export function applicationModeLabel(
  mode: OfferApplicationMode,
  code?: string | null,
) {
  switch (mode) {
    case "STAFF_ONLY":
      return "Staff only";
    case "OFFER_CODE":
      return code ? `Offer code: ${code}` : "Offer code";
    case "AUTOMATICALLY":
      return "Automatically applied";
    default:
      return mode;
  }
}

export function membershipScopeLabel(scope?: OfferMembershipScope | null) {
  if (scope === "SPECIFIC") return "Specific membership plans";
  if (scope === "ANY") return "Any membership";
  return "";
}

export function toggleId(ids: string[], id: string, checked: boolean) {
  if (checked) return ids.includes(id) ? ids : [...ids, id];
  return ids.filter((value) => value !== id);
}

export function offerDiscountCount(offer: Offer) {
  return offer.discountCount ?? offer.discounts.length;
}

export function offerDrawerSubtitle(offer: Offer) {
  const count = offerDiscountCount(offer);
  const mode = applicationModeLabel(offer.applicationMode, offer.offerCode);
  return `${mode} · ${count} discount${count === 1 ? "" : "s"}`;
}
