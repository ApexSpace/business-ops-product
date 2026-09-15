import type {
  ClientPackageDetailRow,
  ClientPackageListRow,
} from '../repositories/client-package.repository';
import type { PackageTemplateRow } from '../repositories/package-template.repository';
import type {
  ClientPackageDetailResponseDto,
  ClientPackageListItemResponseDto,
  PackageHistoryEventResponseDto,
  PackageServiceAllocationResponseDto,
  PackageServiceGroupResponseDto,
  PackageTemplateResponseDto,
} from '../dto/package.dto';

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

export function toPackageServiceGroup(
  group: PackageTemplateRow['serviceGroups'][number],
): PackageServiceGroupResponseDto {
  return {
    id: group.id,
    quantity: group.quantity,
    quantityType: group.quantityType,
    groupPrice: group.groupPrice.toFixed(2),
    sortOrder: group.sortOrder,
    items: group.serviceGroupItems.map((item) => ({
      serviceId: item.serviceId,
      service: {
        id: item.service.id,
        name: item.service.name,
      },
    })),
  };
}

export function toPackageTemplate(
  row: PackageTemplateRow,
  directLink?: string | null,
): PackageTemplateResponseDto {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    totalPrice: row.totalPrice.toFixed(2),
    chargeTax: row.chargeTax,
    expirationPolicy: row.expirationPolicy,
    expirationDays: row.expirationDays,
    onlineSalesEnabled: row.onlineSalesEnabled,
    shortDescription: row.shortDescription,
    description: row.description,
    requireAgreement: row.requireAgreement,
    agreementText: row.agreementText,
    commissionBasis: row.commissionBasis,
    sortOrder: row.sortOrder,
    serviceGroups: row.serviceGroups.map(toPackageServiceGroup),
    directLink: directLink ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function totalQty(row: ClientPackageListRow): number {
  return row.serviceAllocations.reduce((sum, a) => sum + a.initialQty, 0);
}

export function toClientPackageListItem(
  row: ClientPackageListRow,
): ClientPackageListItemResponseDto {
  return {
    id: row.id,
    contact: {
      id: row.contact.id,
      name: contactName(row.contact),
      email: row.contact.email,
    },
    packageTemplate: {
      id: row.packageTemplate.id,
      name: row.packageTemplate.name,
      emoji: row.packageTemplate.emoji,
      totalPrice: row.packageTemplate.totalPrice.toFixed(2),
    },
    totalQty: totalQty(row),
    purchaseDate: row.purchaseDate,
    expirationDate: row.expirationDate,
    status: row.status,
    source: row.source,
    isDemo: row.isDemo,
  };
}

function toHistoryEvent(
  event: ClientPackageDetailRow['history'][number],
): PackageHistoryEventResponseDto {
  return {
    id: event.id,
    eventType: event.eventType,
    description: event.description,
    quantityChange: event.quantityChange,
    serviceId: event.serviceId,
    createdAt: event.createdAt,
  };
}

export function toClientPackageDetail(
  row: ClientPackageDetailRow,
): ClientPackageDetailResponseDto {
  return {
    ...toClientPackageListItem(row),
    stripePaymentIntentId: row.stripePaymentIntentId,
    serviceAllocations: row.serviceAllocations.map(
      (a): PackageServiceAllocationResponseDto => ({
        serviceId: a.serviceId,
        serviceName: a.service.name,
        remaining: a.remaining,
        initialQty: a.initialQty,
      }),
    ),
    history: row.history.map(toHistoryEvent),
  };
}
