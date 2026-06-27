import type { MembershipPlanRow } from '../repositories/membership-plan.repository';
import type {
  ClientMembershipDetailRow,
  ClientMembershipListRow,
} from '../repositories/client-membership.repository';
import type {
  ClientMembershipDetailResponseDto,
  ClientMembershipListItemResponseDto,
  MembershipPlanResponseDto,
  MembershipServiceGroupResponseDto,
} from '../dto/membership.dto';

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

export function toMembershipServiceGroup(
  group: MembershipPlanRow['serviceGroups'][number],
): MembershipServiceGroupResponseDto {
  return {
    id: group.id,
    quantity: group.quantity,
    groupPrice: group.groupPrice?.toFixed(2) ?? null,
    sortOrder: group.sortOrder,
    items: group.services.map((item) => ({
      serviceId: item.serviceId,
      service: {
        id: item.service.id,
        name: item.service.name,
      },
    })),
  };
}

export function toMembershipPlan(
  row: MembershipPlanRow,
  directLink?: string | null,
): MembershipPlanResponseDto {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    planType: row.planType,
    billingIntervalCount: row.billingIntervalCount,
    billingIntervalUnit: row.billingIntervalUnit,
    price: row.price.toFixed(2),
    chargeServiceTax: row.chargeServiceTax,
    servicesExpireAfter: row.servicesExpireAfter,
    creditAmount: row.creditAmount?.toFixed(2) ?? null,
    productDiscountPercent: row.productDiscountPercent.toFixed(2),
    serviceDiscountPercent: row.serviceDiscountPercent.toFixed(2),
    requireAgreement: row.requireAgreement,
    agreementText: row.agreementText,
    availableOnline: row.availableOnline,
    shortDescription: row.shortDescription,
    description: row.description,
    commissionBasis: row.commissionBasis,
    isArchived: row.isArchived,
    sortOrder: row.sortOrder,
    serviceGroups: row.serviceGroups.map(toMembershipServiceGroup),
    activeMembershipCount: row._count.clientMemberships,
    directLink: directLink ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toClientMembershipListItem(
  row: ClientMembershipListRow,
): ClientMembershipListItemResponseDto {
  return {
    id: row.id,
    contact: {
      id: row.contact.id,
      name: contactName(row.contact),
      email: row.contact.email,
    },
    plan: {
      id: row.plan.id,
      name: row.plan.name,
      emoji: row.plan.emoji,
      price: row.plan.price.toFixed(2),
    },
    startDate: row.startDate,
    price: row.price.toFixed(2),
    status: row.status,
    billingIntervalUnit: row.plan.billingIntervalUnit,
    nextBillingDate: row.nextBillingDate,
  };
}

export function toClientMembershipDetail(
  row: ClientMembershipDetailRow,
): ClientMembershipDetailResponseDto {
  const currentPeriodRecords = row.usageRecords.filter(
    (r) => !r.periodEnd || r.periodEnd > new Date(),
  );

  return {
    ...toClientMembershipListItem(row),
    currentPeriodStart: row.currentPeriodStart,
    currentPeriodEnd: row.currentPeriodEnd,
    productDiscountPercent: row.productDiscountPercent.toFixed(2),
    serviceDiscountPercent: row.serviceDiscountPercent.toFixed(2),
    planVersion: row.planVersion,
    usageRecords: currentPeriodRecords.map((record) => ({
      id: record.id,
      serviceGroupId: record.serviceGroupId,
      totalSlots: record.totalSlots,
      usedSlots: record.usedSlots,
      expiresAt: record.expiresAt,
      services: record.serviceGroup.services.map((s) => s.service.name),
    })),
    billingHistory: row.billingHistory.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      amount: event.amount?.toFixed(2) ?? null,
      occurredAt: event.occurredAt,
    })),
  };
}
