import type { Estimate } from "@/features/estimates/types";
import type { Invoice } from "@/features/invoices/types";

function primaryLineItemTitle(
  items: { title: string }[],
): string | null {
  const title = items[0]?.title?.trim();
  if (!title) return null;
  if (items.length > 1) {
    return `${title} + ${items.length - 1} more`;
  }
  return title;
}

/** Display name for estimates table (quote name column). */
export function getEstimateQuoteName(estimate: Estimate): string {
  const fromLines = primaryLineItemTitle(estimate.items);
  if (fromLines) return fromLines;
  if (estimate.workItem?.title?.trim()) return estimate.workItem.title.trim();
  if (estimate.contact?.label?.trim()) return estimate.contact.label.trim();
  return "Estimate";
}

/** Display name for invoices table (invoice name column). */
export function getInvoiceDisplayName(invoice: Invoice): string {
  const fromLines = primaryLineItemTitle(invoice.items);
  if (fromLines) return fromLines;
  if (invoice.workItem?.title?.trim()) return invoice.workItem.title.trim();
  if (invoice.contact?.label?.trim()) return invoice.contact.label.trim();
  return "Invoice";
}
