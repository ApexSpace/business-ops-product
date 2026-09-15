"use client";

import { useState } from "react";
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

let stripePromise: Promise<Stripe | null> | null = null;
let stripeAccountId: string | null = null;

function getStripePromise(publishableKey: string, accountId?: string | null) {
  if (!stripePromise || (accountId && accountId !== stripeAccountId)) {
    stripeAccountId = accountId ?? null;
    stripePromise = accountId
      ? loadStripe(publishableKey, { stripeAccount: accountId })
      : loadStripe(publishableKey);
  }
  return stripePromise;
}

function SaveCardForm({
  clientSecret,
  onSuccess,
  onError,
}: {
  clientSecret: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    const cardElement = elements?.getElement(CardElement);
    if (!stripe || !cardElement) return;

    setSubmitting(true);
    const { error, setupIntent } = await stripe.confirmCardSetup(
      clientSecret,
      { payment_method: { card: cardElement } },
    );
    setSubmitting(false);

    if (error) {
      onError(error.message ?? "Could not save card");
      return;
    }

    if (
      setupIntent?.status === "succeeded" ||
      setupIntent?.status === "processing"
    ) {
      onSuccess();
      return;
    }

    onError("Card was not saved. Try again.");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-input bg-background px-3 py-3">
        <CardElement
          options={{
            hidePostalCode: false,
            style: {
              base: {
                fontSize: "16px",
                color: "hsl(var(--foreground))",
                "::placeholder": { color: "hsl(var(--muted-foreground))" },
              },
            },
          }}
        />
      </div>
      <Button
        type="button"
        className="w-full"
        disabled={!stripe || submitting}
        onClick={() => void handleSave()}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save card"
        )}
      </Button>
    </div>
  );
}

export interface EmbeddedStripeSetupProps {
  publishableKey: string;
  clientSecret: string;
  stripeAccountId?: string | null;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export function EmbeddedStripeSetup({
  publishableKey,
  clientSecret,
  stripeAccountId,
  onSuccess,
  onError,
}: EmbeddedStripeSetupProps) {
  const stripe = getStripePromise(publishableKey, stripeAccountId);

  return (
    <Elements
      key={clientSecret}
      stripe={stripe}
      options={{
        clientSecret,
        appearance: { theme: "stripe" },
      }}
    >
      <SaveCardForm
        clientSecret={clientSecret}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}
