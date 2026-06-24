"use client";

import { InvoiceCollectPaymentPanel } from "@/features/payments/payments-kit/invoice-collect-payment-panel";
import {
  closeCheckout,
  waitForCheckoutSettled,
} from "@/features/sales/api/checkouts.api";

interface SaleClosePanelProps {
  checkoutId: string;
  contactId: string;
  balanceDue: number;
  onComplete: () => void;
}

export function SaleClosePanel({
  checkoutId,
  contactId,
  balanceDue,
  onComplete,
}: SaleClosePanelProps) {
  return (
    <InvoiceCollectPaymentPanel
      invoiceId={checkoutId}
      contactId={contactId}
      balanceDue={balanceDue}
      collectOverride={async (tenders) => {
        const result = await closeCheckout(checkoutId, { tenders });
        return {
          completed: result.completed,
          stripeTenders: result.stripeTenders,
        };
      }}
      awaitSettlement={() => waitForCheckoutSettled(checkoutId)}
      successMessage="Sale closed"
      onComplete={onComplete}
    />
  );
}
