"use client";

import type { ReactNode } from "react";
import {
  InvoiceCollectPaymentPanel,
  type InvoiceCollectPaymentPanelProps,
} from "@/features/payments/payments-kit/invoice-collect-payment-panel";

export interface PaymentCheckoutProps
  extends Pick<
    InvoiceCollectPaymentPanelProps,
    | "contactId"
    | "balanceDue"
    | "onComplete"
    | "collectOverride"
    | "awaitSettlement"
    | "successMessage"
  > {
  payableType: "INVOICE";
  payableId: string;
  footer?: ReactNode;
}

/**
 * Generic staff-facing payment shell — wraps collect UI + embedded Stripe.
 * Existing invoice/sales flows pass through unchanged props.
 */
export function PaymentCheckout({
  payableType: _payableType,
  payableId,
  footer,
  ...rest
}: PaymentCheckoutProps) {
  return (
    <div className="space-y-4">
      <InvoiceCollectPaymentPanel invoiceId={payableId} {...rest} />
      {footer}
    </div>
  );
}
