import { toast } from "sonner";
import { getInvoice } from "@/features/invoices/api/invoices.api";
import { openInvoicePublicView } from "@/features/invoices/utils/invoice-payment-link";
import type { Payment } from "@/features/payments/types";

export async function viewTransactionInvoicePublic(
  payment: Payment,
): Promise<void> {
  if (!payment.invoiceId) {
    toast.error("No invoice linked to this transaction");
    return;
  }
  try {
    const invoice = await getInvoice(payment.invoiceId);
    if (!openInvoicePublicView(invoice)) {
      toast.error("Public link is not available for this invoice");
    }
  } catch (err) {
    toast.error(
      err instanceof Error ? err.message : "Could not open invoice",
    );
  }
}
