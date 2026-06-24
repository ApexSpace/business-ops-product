"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface RedirectCheckoutButtonProps {
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  onRedirect: () => Promise<{ checkoutUrl: string } | void>;
}

/** Opens Stripe hosted checkout from orchestrator redirect tenders. */
export function RedirectCheckoutButton({
  label = "Pay with Stripe",
  disabled,
  loading,
  onRedirect,
}: RedirectCheckoutButtonProps) {
  return (
    <Button
      type="button"
      className="w-full"
      disabled={disabled || loading}
      onClick={() => {
        void (async () => {
          const result = await onRedirect();
          if (result?.checkoutUrl) {
            window.location.href = result.checkoutUrl;
          }
        })();
      }}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Preparing checkout…
        </>
      ) : (
        label
      )}
    </Button>
  );
}
