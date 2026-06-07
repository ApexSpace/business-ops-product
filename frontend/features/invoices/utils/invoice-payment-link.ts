import type { Invoice } from "@/features/invoices/types";
import { formatMoney } from "@/features/invoices/schemas/invoice-profile";

export function openInvoicePublicView(invoice: Invoice): boolean {
  const url = resolveInvoicePublicUrl(invoice);
  if (!url) {
    return false;
  }
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

export function resolveInvoicePublicUrl(invoice: Invoice): string {
  if (invoice.publicUrl) return invoice.publicUrl;
  if (typeof window !== "undefined" && invoice.publicToken) {
    return `${window.location.origin}/invoice/${invoice.publicToken}`;
  }
  return "";
}

export function buildInvoicePaymentShareMessage(
  invoice: Invoice,
  contactName: string,
): string {
  const link = resolveInvoicePublicUrl(invoice);
  const amount = formatMoney(invoice.balanceDue);
  return `Hi ${contactName},

Your invoice ${invoice.invoiceNumber} is ready.

Amount Due: ${amount}

Pay securely online:
${link}

Thank you.`;
}
