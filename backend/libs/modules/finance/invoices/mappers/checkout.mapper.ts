import { InvoiceStatus } from '@prisma/client';
import { resolveContactLabel } from '@app/modules/crm/contacts/mappers/contact.mapper';
import {
  CheckoutItemResponseDto,
  CheckoutResponseDto,
} from '../dto/checkout-response.dto';
import { CheckoutWithRelations } from '../repositories/checkout.repository';

const checkoutOffersParser = {
  parseMetadata(raw: unknown) {
    if (!raw || typeof raw !== 'object') return {};
    return raw as {
      appliedOffers?: Array<{
        offerId: string;
        offerName: string;
        totalDiscount: number;
      }>;
    };
  },
};

function staffLabel(
  user:
    | { firstName: string | null; lastName: string | null }
    | null
    | undefined,
): string | null {
  if (!user) return null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || null;
}

export function toCheckoutItemResponse(
  item: CheckoutWithRelations['items'][number],
): CheckoutItemResponseDto {
  const label = staffLabel(item.staffUser);
  return {
    id: item.id,
    lineType: item.lineType,
    serviceId: item.serviceId,
    productId: item.productId,
    variantId: item.variantId,
    staffUserId: item.staffUserId,
    title: item.title,
    description: item.description,
    quantity: item.quantity.toString(),
    unitPrice: item.unitPrice.toString(),
    totalPrice: item.totalPrice.toString(),
    sortOrder: item.sortOrder,
    staff: item.staffUser && label ? { id: item.staffUser.id, label } : null,
  };
}

export function toCheckoutResponse(
  checkout: CheckoutWithRelations,
): CheckoutResponseDto {
  const displaySequence = checkout.displaySequence ?? 0;
  const offerMeta = checkoutOffersParser.parseMetadata(checkout.metadata);
  return {
    id: checkout.id,
    contactId: checkout.contactId,
    saleNumber: `Sale #${displaySequence}`,
    displaySequence,
    invoiceNumber: checkout.invoiceNumber,
    status: checkout.status,
    isOpen: checkout.status === InvoiceStatus.OPEN,
    issueDate: checkout.issueDate,
    subtotal: checkout.subtotal.toString(),
    taxAmount: checkout.taxAmount.toString(),
    discountAmount: checkout.discountAmount.toString(),
    totalAmount: checkout.totalAmount.toString(),
    balanceDue: checkout.balanceDue.toString(),
    notes: checkout.notes,
    closedAt: checkout.closedAt,
    closedById: checkout.closedById,
    createdAt: checkout.createdAt,
    updatedAt: checkout.updatedAt,
    contact: checkout.contact
      ? {
          id: checkout.contact.id,
          label: resolveContactLabel(checkout.contact),
        }
      : undefined,
    items: checkout.items.map(toCheckoutItemResponse),
    appliedOffers: offerMeta.appliedOffers?.map((offer) => ({
      offerId: offer.offerId,
      offerName: offer.offerName,
      totalDiscount: offer.totalDiscount.toFixed(2),
    })),
  };
}
