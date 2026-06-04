import { resolveContactLabel } from '@app/modules/crm/contacts/mappers/contact.mapper';
import { PaymentResponseDto } from '../dto/payment-response.dto';
import { PaymentWithRelations } from '../repositories/payment.repository';

export function toPaymentResponse(
  payment: PaymentWithRelations,
): PaymentResponseDto {
  return {
    id: payment.id,
    businessId: payment.businessId,
    invoiceId: payment.invoiceId,
    contactId: payment.contactId,
    amount: payment.amount.toFixed(2),
    method: payment.method,
    reference: payment.reference,
    notes: payment.notes,
    paidAt: payment.paidAt,
    createdById: payment.createdById,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    contact: payment.contact
      ? {
          id: payment.contact.id,
          label: resolveContactLabel(payment.contact),
        }
      : null,
    invoice: payment.invoice
      ? {
          id: payment.invoice.id,
          invoiceNumber: payment.invoice.invoiceNumber,
          totalAmount: payment.invoice.totalAmount.toFixed(2),
          balanceDue: payment.invoice.balanceDue.toFixed(2),
          status: payment.invoice.status,
        }
      : null,
    createdBy: payment.createdBy,
  };
}
