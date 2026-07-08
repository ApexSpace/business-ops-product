"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  const zeroCloseMutation = useMutation({
    mutationFn: () => closeCheckout(checkoutId, { tenders: [] }),
    onSuccess: async (result) => {
      if (result.completed) {
        try {
          await waitForCheckoutSettled(checkoutId);
        } catch {
          // Sale may already be settled synchronously for $0 closes.
        }
        toast.success("Sale closed");
        onComplete();
        return;
      }
      toast.error("Sale could not be closed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (balanceDue <= 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Nothing to collect. Complete the sale to finalize membership redemptions
          and inventory updates.
        </p>
        <Button
          className="w-full"
          disabled={zeroCloseMutation.isPending}
          onClick={() => zeroCloseMutation.mutate()}
        >
          Complete sale
        </Button>
      </div>
    );
  }

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
      awaitSettlement={async () => {
        await waitForCheckoutSettled(checkoutId);
      }}
      successMessage="Sale closed"
      onComplete={onComplete}
    />
  );
}
