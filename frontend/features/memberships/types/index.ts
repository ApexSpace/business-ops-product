export type MembershipPlanType = "SERVICES" | "ACCOUNT_CREDIT";
export type MembershipBillingIntervalUnit = "WEEK" | "MONTH" | "YEAR";
export type MembershipCommissionBasis = "REGULAR_PRICE" | "DISCOUNTED_PRICE";
export type ClientMembershipStatus =
  | "SCHEDULED"
  | "ACTIVE"
  | "PAST_DUE"
  | "UNPAID"
  | "PAUSED"
  | "CANCELED";

export interface MembershipContactSummary {
  id: string;
  name: string;
  email: string | null;
}

export interface MembershipServiceGroupItem {
  serviceId: string;
  service: { id: string; name: string,
};
}

export interface MembershipServiceGroup {
  id: string;
  quantity: number;
  groupPrice: string | null;
  sortOrder: number;
  items: MembershipServiceGroupItem[];
}

export interface MembershipPlan {
  id: string;
  name: string;
  emoji: string | null;
  planType: MembershipPlanType;
  billingIntervalCount: number;
  billingIntervalUnit: MembershipBillingIntervalUnit;
  price: string;
  chargeServiceTax: boolean;
  servicesExpireAfter: number | null;
  creditAmount: string | null;
  productDiscountPercent: string;
  serviceDiscountPercent: string;
  requireAgreement: boolean;
  agreementText: string | null;
  availableOnline: boolean;
  shortDescription: string | null;
  description: string | null;
  commissionBasis: MembershipCommissionBasis;
  isArchived: boolean;
  sortOrder: number;
  serviceGroups: MembershipServiceGroup[];
  activeMembershipCount: number;
  directLink?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipUsageRecord {
  id: string;
  serviceGroupId: string;
  totalSlots: number;
  usedSlots: number;
  expiresAt: string | null;
  services: string[];
}

export interface MembershipBillingEvent {
  id: string;
  eventType: string;
  amount: string | null;
  occurredAt: string;
}

export interface ClientMembershipListItem {
  id: string;
  contact: MembershipContactSummary;
  plan: { id: string; name: string; emoji: string | null; price: string,
};
  startDate: string;
  price: string;
  status: ClientMembershipStatus;
  billingIntervalUnit: MembershipBillingIntervalUnit;
  nextBillingDate: string | null;
}

export interface ClientMembershipDetail extends ClientMembershipListItem {
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  productDiscountPercent: string;
  serviceDiscountPercent: string;
  planVersion: number;
  usageRecords: MembershipUsageRecord[];
  billingHistory: MembershipBillingEvent[];
}

export interface MembershipSettings {
  allowClientCancel: boolean;
  onlineSalesEnabled: boolean;
  publicSlug: string | null;
  shareableLink: string | null;
  embedScript: string | null;
  overlayLink: string | null;
  stripeReady: boolean;
}

export interface ClientMembershipsListFilters {
  page?: number;
  limit?: number;
  contactId?: string;
  search?: string;
  status?: ClientMembershipStatus | "all_except_canceled";
  planId?: string;
  showDifferentVersionsOnly?: boolean;
  showOlderUnpaid?: boolean;
}

export interface CreateClientMembershipInput {
  contactId: string;
  planId: string;
  startDate?: string;
}

export interface CreateMembershipPlanInput {
  name: string;
  planType: MembershipPlanType;
}

export interface UpdatePlanDetailsInput {
  name?: string;
  emoji?: string;
  billingIntervalCount?: number;
  billingIntervalUnit?: MembershipBillingIntervalUnit;
  price?: number;
  chargeServiceTax?: boolean;
  servicesExpireAfterDays?: number | null;
  creditAmount?: number | null;
}

export interface ServiceGroupItemInput {
  id?: string;
  quantity: number;
  groupPrice?: number;
  serviceIds: string[];
}

export interface UpdateClientMembershipInput {
  action:
    | "pause"
    | "resume"
    | "cancel"
    | "change_payment_method"
    | "change_price_discounts"
    | "add_extra_services"
    | "renew_early";
  cancelAtPeriodEnd?: boolean;
  paymentMethodId?: string;
  price?: number;
  productDiscountPercent?: number;
  serviceDiscountPercent?: number;
  serviceGroupId?: string;
  quantity?: number;
  expiresAt?: string;
}

export interface AvailableMembershipForService {
  membershipId: string;
  planName: string;
  usageRecords: Array<{
    id: string;
    serviceGroupId: string;
    remaining: number;
    totalSlots: number;
  }>;
}
