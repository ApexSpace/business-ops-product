import { resolveContactLabel } from '@app/modules/crm/contacts/mappers/contact.mapper';
import {
  EstimateItemResponseDto,
  EstimateResponseDto,
} from '../dto/estimate-response.dto';
import { EstimateWithRelations } from '../repositories/estimate.repository';

function toItemResponse(
  item: EstimateWithRelations['items'][number],
): EstimateItemResponseDto {
  return {
    id: item.id,
    serviceId: item.serviceId,
    title: item.title,
    description: item.description,
    quantity: item.quantity.toString(),
    unitPrice: item.unitPrice.toString(),
    totalPrice: item.totalPrice.toString(),
    createdAt: item.createdAt,
  };
}

export function toEstimateResponse(
  estimate: EstimateWithRelations,
): EstimateResponseDto {
  return {
    id: estimate.id,
    businessId: estimate.businessId,
    contactId: estimate.contactId,
    workItemId: estimate.workItemId,
    estimateNumber: estimate.estimateNumber,
    status: estimate.status,
    issueDate: estimate.issueDate,
    expiryDate: estimate.expiryDate,
    subtotal: estimate.subtotal.toString(),
    taxAmount: estimate.taxAmount.toString(),
    discountAmount: estimate.discountAmount.toString(),
    totalAmount: estimate.totalAmount.toString(),
    notes: estimate.notes,
    termsAndConditions: estimate.termsAndConditions,
    createdById: estimate.createdById,
    createdAt: estimate.createdAt,
    updatedAt: estimate.updatedAt,
    contact: estimate.contact
      ? {
          id: estimate.contact.id,
          label: resolveContactLabel(estimate.contact),
        }
      : undefined,
    workItem: estimate.workItem
      ? { id: estimate.workItem.id, title: estimate.workItem.title }
      : null,
    items: estimate.items.map(toItemResponse),
  };
}
