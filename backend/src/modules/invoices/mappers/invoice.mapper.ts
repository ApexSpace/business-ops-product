import { resolveContactLabel } from '../../contacts/mappers/contact.mapper';
import {
  InvoiceItemResponseDto,
  InvoiceResponseDto,
} from '../dto/invoice-response.dto';
import { InvoiceWithRelations } from '../repositories/invoice.repository';

function toItemResponse(
  item: InvoiceWithRelations['items'][number],
): InvoiceItemResponseDto {
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

export function toInvoiceResponse(
  invoice: InvoiceWithRelations,
): InvoiceResponseDto {
  return {
    id: invoice.id,
    businessId: invoice.businessId,
    contactId: invoice.contactId,
    estimateId: invoice.estimateId,
    workItemId: invoice.workItemId,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    subtotal: invoice.subtotal.toString(),
    taxAmount: invoice.taxAmount.toString(),
    discountAmount: invoice.discountAmount.toString(),
    totalAmount: invoice.totalAmount.toString(),
    balanceDue: invoice.balanceDue.toString(),
    notes: invoice.notes,
    paymentTerms: invoice.paymentTerms,
    termsAndConditions: invoice.termsAndConditions,
    createdById: invoice.createdById,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
    contact: invoice.contact
      ? {
          id: invoice.contact.id,
          label: resolveContactLabel(invoice.contact),
        }
      : undefined,
    estimate: invoice.estimate
      ? {
          id: invoice.estimate.id,
          estimateNumber: invoice.estimate.estimateNumber,
        }
      : null,
    workItem: invoice.workItem
      ? { id: invoice.workItem.id, title: invoice.workItem.title }
      : null,
    items: invoice.items.map(toItemResponse),
  };
}
