import { InvoicePaymentStatus, InvoiceStatus } from '@prisma/client';
import { resolveContactLabel } from '@app/modules/crm/contacts/mappers/contact.mapper';
import { isInvoiceOverdue } from '@app/modules/finance/shared/utils/financial-due-date.util';
import { extractFinancialSettings } from '@app/modules/platform/business/utils/financial-settings.util';
import { PublicInvoiceResponseDto } from '../dto/public-invoice-response.dto';
import { toItemResponse } from './invoice.mapper';
import type { InvoiceWithRelations } from '../repositories/invoice.repository';

export type PublicInvoiceWithBusiness = InvoiceWithRelations & {
  business: { name: string; displayName: string | null; settings: unknown };
};

export function toPublicInvoiceResponse(
  invoice: PublicInvoiceWithBusiness,
): PublicInvoiceResponseDto {
  const financial = extractFinancialSettings(
    invoice.business as Parameters<typeof extractFinancialSettings>[0],
  );
  const businessName =
    invoice.business.displayName?.trim() || invoice.business.name;

  const isOverdue = isInvoiceOverdue({
    status: invoice.status,
    dueDate: invoice.dueDate,
    balanceDue: invoice.balanceDue,
  });

  const canPayOnline =
    invoice.paymentStatus !== InvoicePaymentStatus.PAID &&
    invoice.balanceDue.greaterThan(0) &&
    invoice.status !== InvoiceStatus.VOID;

  return {
    invoiceNumber: invoice.invoiceNumber,
    businessName,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    contactLabel: resolveContactLabel(invoice.contact),
    subtotal: invoice.subtotal.toString(),
    taxAmount: invoice.taxAmount.toString(),
    discountAmount: invoice.discountAmount.toString(),
    totalAmount: invoice.totalAmount.toString(),
    paidAmount: invoice.paidAmount.toString(),
    balanceDue: invoice.balanceDue.toString(),
    paymentStatus: invoice.paymentStatus,
    currencyCode: financial.taxesAndCurrency.currencyCode,
    currencySymbol: financial.taxesAndCurrency.currencySymbol,
    isOverdue,
    canPayOnline,
    items: invoice.items.map(toItemResponse),
  };
}
