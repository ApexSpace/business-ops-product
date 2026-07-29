import type { Prisma } from '@prisma/client';
import type {
  DiscountAmountType,
  DiscountAppliesTo,
  DiscountScope,
  MembershipCommissionBasis,
  OfferApplicationMode,
  OfferMembershipScope,
} from '@prisma/client';

export type OfferDateRule = {
  type: 'date_range' | 'recurring_days' | 'recurring_time_window';
  startDate?: string;
  endDate?: string;
  daysOfWeek?: number[];
  startTime?: string;
  endTime?: string;
};

export type CheckoutLineItem = {
  id?: string;
  lineType: 'SERVICE' | 'PRODUCT' | string;
  serviceId?: string | null;
  productId?: string | null;
  serviceCategoryId?: string | null;
  productCategoryId?: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
};

export type CheckoutContext = {
  clientId?: string;
  appointmentDateTime?: Date;
  bookingDate?: Date;
  saleDate: Date;
  lineItems: CheckoutLineItem[];
  subtotal: number;
  staffMemberIds: string[];
  offerCodeEntered?: string;
  manualOfferId?: string;
  excludedOfferIds?: string[];
};

export type LineItemDiscount = {
  lineItemId?: string;
  serviceId?: string | null;
  productId?: string | null;
  discountAmount: number;
  originalUnitPrice: number;
  discountedUnitPrice: number;
};

export type DiscountBreakdown = {
  discountId: string;
  appliesTo: DiscountAppliesTo;
  amountType: DiscountAmountType;
  amount: number;
  lineDiscounts: LineItemDiscount[];
  entireSaleDiscount?: number;
};

export type ApplicableOffer = {
  offerId: string;
  offerName: string;
  applicationMode: OfferApplicationMode;
  commissionBasis: MembershipCommissionBasis;
  totalDiscount: number;
  discounts: DiscountBreakdown[];
};

export type OfferWithDiscounts = {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  sortOrder: number;
  applicationMode: OfferApplicationMode;
  offerCode: string | null;
  autoApptDateEnabled: boolean;
  autoApptDateRules: OfferDateRule[] | null;
  autoBookingDateEnabled: boolean;
  autoBookingDateRules: OfferDateRule[] | null;
  autoSaleDateEnabled: boolean;
  autoSaleDateRules: OfferDateRule[] | null;
  minAmountEnabled: boolean;
  minAmount: Prisma.Decimal | null;
  oncePerClient: boolean;
  newClientsOnly: boolean;
  membershipRequired: boolean;
  membershipScope: OfferMembershipScope | null;
  specificMembershipPlanIds: string[] | null;
  specificProvidersEnabled: boolean;
  specificProviderIds: string[] | null;
  commissionBasis: MembershipCommissionBasis;
  discounts: Array<{
    id: string;
    appliesTo: DiscountAppliesTo;
    amountType: DiscountAmountType;
    amount: Prisma.Decimal;
    serviceScope: DiscountScope;
    productScope: DiscountScope;
    specificServiceCategoryIds: string[] | null;
    specificServiceIds: string[] | null;
    specificProductCategoryIds: string[] | null;
    specificProductIds: string[] | null;
    sortOrder: number;
  }>;
};
