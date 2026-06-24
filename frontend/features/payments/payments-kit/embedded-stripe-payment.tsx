"use client";

import { useState } from "react";
import {
  CardElement,
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

let stripePromise: Promise<Stripe | null> | null = null;
let stripeAccountId: string | null = null;

function getStripePromise(publishableKey: string, accountId?: string | null) {
  if (
    !stripePromise ||
    (accountId && accountId !== stripeAccountId)
  ) {
    stripeAccountId = accountId ?? null;
    stripePromise = accountId
      ? loadStripe(publishableKey, { stripeAccount: accountId })
      : loadStripe(publishableKey);
  }
  return stripePromise;
}

export type EmbeddedStripePaymentMode = "staff" | "checkout";

interface StaffCardPaymentFormProps {
  clientSecret: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}

/** Staff POS: classic card fields only — no Bank / Klarna / Link tabs. */
function StaffCardPaymentForm({
  clientSecret,
  onSuccess,
  onError,
}: StaffCardPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function handlePay() {
    const cardElement = elements?.getElement(CardElement);
    if (!stripe || !cardElement) return;

    setSubmitting(true);
    const { error, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      { payment_method: { card: cardElement } },
    );
    setSubmitting(false);

    if (error) {
      onError(error.message ?? "Card payment failed");
      return;
    }

    if (
      paymentIntent?.status === "succeeded" ||
      paymentIntent?.status === "processing"
    ) {
      onSuccess();
      return;
    }

    onError("Payment was not completed. Try again.");
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
              invalid: { color: "hsl(var(--destructive))" },
            },
          }}
        />
      </div>
      <Button
        type="button"
        className="w-full"
        disabled={!stripe || submitting}
        onClick={() => void handlePay()}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Processing…
          </>
        ) : (
          "Pay with card"
        )}
      </Button>
    </div>
  );
}

interface CheckoutPaymentFormProps {
  onSuccess: () => void;
  onError: (message: string) => void;
}

/** Customer self-checkout: full Payment Element with all enabled methods. */
function CheckoutPaymentForm({
  onSuccess,
  onError,
}: CheckoutPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function handlePay() {
    if (!stripe || !elements) return;

    setSubmitting(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    setSubmitting(false);

    if (error) {
      onError(error.message ?? "Payment failed");
      return;
    }

    if (
      paymentIntent?.status === "succeeded" ||
      paymentIntent?.status === "processing"
    ) {
      onSuccess();
      return;
    }

    onError("Payment was not completed. Try again.");
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      <Button
        type="button"
        className="w-full"
        disabled={!stripe || submitting}
        onClick={() => void handlePay()}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Processing…
          </>
        ) : (
          "Pay now"
        )}
      </Button>
    </div>
  );
}

export interface EmbeddedStripePaymentProps {
  publishableKey: string;
  clientSecret: string;
  stripeAccountId?: string | null;
  /** Staff-recorded payments: card fields only. Checkout: all enabled methods. */
  mode?: EmbeddedStripePaymentMode;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export function EmbeddedStripePayment({
  publishableKey,
  clientSecret,
  stripeAccountId,
  mode = "staff",
  onSuccess,
  onError,
}: EmbeddedStripePaymentProps) {
  const stripe = getStripePromise(publishableKey, stripeAccountId);

  return (
    <Elements
      key={`${clientSecret}-${mode}`}
      stripe={stripe}
      options={{
        clientSecret,
        appearance: { theme: "stripe" },
      }}
    >
      {mode === "staff" ? (
        <StaffCardPaymentForm
          clientSecret={clientSecret}
          onSuccess={onSuccess}
          onError={onError}
        />
      ) : (
        <CheckoutPaymentForm onSuccess={onSuccess} onError={onError} />
      )}
    </Elements>
  );
}
