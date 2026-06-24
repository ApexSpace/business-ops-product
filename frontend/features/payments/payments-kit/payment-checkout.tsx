"use client";

import type { ReactNode } from "react";
import { InvoiceCollectPaymentPanel } from "@/features/payments/payments-kit/invoice-collect-payment-panel";
import type { CollectPaymentResult } from "@/features/payments/api/payment-collection.api";
import type { PaymentMethod } from "@/features/payments/api/payment-collection.api";

export interface PaymentCheckoutProps {
  payableType: "INVOICE";
  payableId: string;
  contactId: string;
  balanceDue: number;
  onComplete: () => void;
  collectOverride?: (tenders: {
    method: PaymentMethod;
    amount: number;
    contactPaymentMethodId?: string;
  }[]) => Promise<{
    completed: boolean;
    stripeTenders: CollectPaymentResult["stripeTenders"];
    redirectTenders?: CollectPaymentResult["redirectTenders"];
  }>;
  awaitSettlement?: () => Promise<void>;
  successMessage?: string;
  footer?: ReactNode;
}

/**
 * Generic staff-facing payment shell — wraps collect UI + embedded Stripe.
 * Existing invoice/sales flows pass through unchanged props.
 */
export function PaymentCheckout(props: PaymentCheckoutProps) {
  return (
    <div className="space-y-4">
      <InvoiceCollectPaymentPanel {...props} />
      {props.footer}
    </div>
  );
}
