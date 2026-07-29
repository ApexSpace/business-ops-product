export type OfferApplicationMode = "STAFF_ONLY" | "OFFER_CODE" | "AUTOMATICALLY";
export type OfferMembershipScope = "ANY" | "SPECIFIC";
export type DiscountAppliesTo = "SERVICES" | "PRODUCTS" | "ENTIRE_SALE";
export type DiscountAmountType = "PERCENTAGE" | "FIXED";
export type DiscountScope = "ALL" | "SPECIFIC";
export type MembershipCommissionBasis = "REGULAR_PRICE" | "DISCOUNTED_PRICE";

export type OfferDateRule = {
  type: "date_range" | "recurring_days" | "recurring_time_window";
  startDate?: string;
  endDate?: string;
  daysOfWeek?: number[];
  startTime?: string;
  endTime?: string;
};

export interface OfferDiscount {
  id: string;
  appliesTo: DiscountAppliesTo;
  amountType: DiscountAmountType;
  amount: string;
  serviceScope: DiscountScope;
  productScope: DiscountScope;
  specificServiceCategoryIds?: string[];
  specificServiceIds?: string[];
  specificProductCategoryIds?: string[];
  specificProductIds?: string[];
  sortOrder: number;
  summary: string;
  subtext: string;
}

export interface Offer {
  id: string;
  name: string;
  description?: string | null;
  isEnabled: boolean;
  sortOrder: number;
  applicationMode: OfferApplicationMode;
  offerCode?: string | null;
  autoApptDateEnabled: boolean;
  autoApptDateRules?: OfferDateRule[] | null;
  autoBookingDateEnabled: boolean;
  autoBookingDateRules?: OfferDateRule[] | null;
  autoSaleDateEnabled: boolean;
  autoSaleDateRules?: OfferDateRule[] | null;
  minAmountEnabled: boolean;
  minAmount?: string | null;
  oncePerClient: boolean;
  newClientsOnly: boolean;
  membershipRequired: boolean;
  membershipScope?: OfferMembershipScope | null;
  specificMembershipPlanIds?: string[] | null;
  specificProvidersEnabled: boolean;
  specificProviderIds?: string[] | null;
  commissionBasis: MembershipCommissionBasis;
  discounts: OfferDiscount[];
  discountCount?: number;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOfferInput {
  name: string;
  description?: string;
}

export interface UpdateOfferDetailsInput {
  name?: string;
  description?: string;
  applicationMode?: OfferApplicationMode;
  offerCode?: string;
  autoApptDateEnabled?: boolean;
  autoApptDateRules?: OfferDateRule[];
  autoBookingDateEnabled?: boolean;
  autoBookingDateRules?: OfferDateRule[];
  autoSaleDateEnabled?: boolean;
  autoSaleDateRules?: OfferDateRule[];
  minAmountEnabled?: boolean;
  minAmount?: number;
  oncePerClient?: boolean;
  newClientsOnly?: boolean;
  membershipRequired?: boolean;
  membershipScope?: OfferMembershipScope;
  specificMembershipPlanIds?: string[];
  specificProvidersEnabled?: boolean;
  specificProviderIds?: string[];
  commissionBasis?: MembershipCommissionBasis;
}

export interface CreateOfferDiscountInput {
  appliesTo: DiscountAppliesTo;
  amountType: DiscountAmountType;
  amount: number;
  serviceScope?: DiscountScope;
  productScope?: DiscountScope;
  specificServiceCategoryIds?: string[];
  specificServiceIds?: string[];
  specificProductCategoryIds?: string[];
  specificProductIds?: string[];
}

export interface OfferUsageReport {
  offerName: string;
  totalUses: number;
  totalDiscountGiven: string;
  uses: Array<{
    clientName: string;
    saleId: string | null;
    usedAt: string;
    discountAmount: string;
  }>;
}
