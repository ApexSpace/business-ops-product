"use client";

import { DRAWER_PRIMARY_BUTTON_CLASS } from "@/lib/design/drawer-tokens";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InvoiceCollectPaymentPanel } from "@/features/payments/payments-kit/invoice-collect-payment-panel";
import {
  closeCheckout,
  waitForCheckoutSettled,
} from "@/features/sales/api/checkouts.api";
import { useDrawerFooterSubmitAction } from "@/lib/hooks/use-drawer-footer-submit-action";

interface SaleClosePanelProps {
  checkoutId: string;
  contactId: string;
  balanceDue: number;
  subtotal?: number;
  onComplete: () => void;
  embedInDrawer?: boolean;
  hideSubmitButton?: boolean;
  onSubmitActionChange?: (
    action: { label: string; disabled: boolean; onClick: () => void } | null,
  ) => void;
}

export function SaleClosePanel({
  checkoutId,
  contactId,
  balanceDue,
  subtotal,
  onComplete,
  embedInDrawer = false,
  hideSubmitButton = false,
  onSubmitActionChange,
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

  useDrawerFooterSubmitAction(
    balanceDue <= 0 && hideSubmitButton && Boolean(onSubmitActionChange),
    "Complete sale",
    zeroCloseMutation.isPending,
    () => {
      zeroCloseMutation.mutate();
    },
    onSubmitActionChange,
  );

  if (balanceDue <= 0) {
    return (
      <div className="space-y-4">
        <p className="text-[13px] font-medium leading-relaxed text-[#8A8A8A]">
          Nothing to collect. Complete the sale to finalize membership
          redemptions and inventory updates.
        </p>
        {!hideSubmitButton ? (
          <Button
            variant="brand"
            className={DRAWER_PRIMARY_BUTTON_CLASS}
            disabled={zeroCloseMutation.isPending}
            onClick={() => zeroCloseMutation.mutate()}
          >
            {zeroCloseMutation.isPending ? "Completing…" : "Complete sale"}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <InvoiceCollectPaymentPanel
      invoiceId={checkoutId}
      contactId={contactId}
      balanceDue={balanceDue}
      subtotal={subtotal}
      embedInDrawer={embedInDrawer}
      hideSubmitButton={hideSubmitButton}
      onSubmitActionChange={onSubmitActionChange}
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
