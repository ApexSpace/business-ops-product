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

export type EmbeddedStripePaymentMode = "staff" | "checkout" | "setup";

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
    if (!stripe || !cardElement) {
      onError("Card field is still loading. Please try again.");
      return;
    }

    setSubmitting(true);
    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: { card: cardElement } },
      );

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
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Card payment could not be processed",
      );
    } finally {
      setSubmitting(false);
    }
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
  const [elementReady, setElementReady] = useState(false);

  async function handlePay() {
    if (!stripe || !elements) {
      onError("Payment form is still loading. Please wait a moment.");
      return;
    }
    if (!elementReady) {
      onError("Payment form is still loading. Please wait a moment.");
      return;
    }

    setSubmitting(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

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
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Payment could not be processed",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement
        onReady={() => setElementReady(true)}
        options={{
          wallets: {
            applePay: "never",
            googlePay: "never",
            link: "never",
          },
          paymentMethodOrder: ["card"],
        }}
      />
      <Button
        type="button"
        className="w-full"
        disabled={!stripe || !elementReady || submitting}
        onClick={() => void handlePay()}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Processing…
          </>
        ) : !elementReady ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading payment…
          </>
        ) : (
          "Pay now"
        )}
      </Button>
    </div>
  );
}

/** Customer card-on-file: SetupIntent via Payment Element (no charge). */
function SetupCardForm({
  onSuccess,
  onError,
}: {
  onSuccess: (setupIntentId: string) => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [elementReady, setElementReady] = useState(false);

  async function handleSave() {
    if (!stripe || !elements) {
      onError("Card form is still loading. Please wait a moment.");
      return;
    }
    if (!elementReady) {
      onError("Card form is still loading. Please wait a moment.");
      return;
    }

    setSubmitting(true);
    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
      });

      if (error) {
        onError(error.message ?? "Card setup failed");
        return;
      }

      if (
        setupIntent?.status === "succeeded" ||
        setupIntent?.status === "processing"
      ) {
        onSuccess(setupIntent.id);
        return;
      }

      onError("Card was not saved. Try again.");
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Card could not be saved",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement
        onReady={() => setElementReady(true)}
        options={{
          wallets: {
            applePay: "never",
            googlePay: "never",
            link: "never",
          },
          paymentMethodOrder: ["card"],
        }}
      />
      <Button
        type="button"
        className="w-full"
        disabled={!stripe || !elementReady || submitting}
        onClick={() => void handleSave()}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Saving…
          </>
        ) : !elementReady ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading…
          </>
        ) : (
          "Save card"
        )}
      </Button>
    </div>
  );
}

export interface EmbeddedStripePaymentProps {
  publishableKey: string;
  clientSecret: string;
  stripeAccountId?: string | null;
  /** Staff-recorded payments: card fields only. Checkout: charge. Setup: tokenize. */
  mode?: EmbeddedStripePaymentMode;
  onSuccess: (result?: { setupIntentId?: string; paymentIntentId?: string }) => void;
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

  // The legacy CardElement (staff mode) is confirmed via
  // `stripe.confirmCardPayment(clientSecret, ...)`, so the Elements group must
  // be created WITHOUT a clientSecret. Passing one here makes Stripe.js expect
  // the PaymentElement flow and it fails to resolve the CardElement.
  // PaymentElement (checkout/setup) requires the clientSecret up front.
  const options =
    mode === "checkout" || mode === "setup"
      ? { clientSecret, appearance: { theme: "stripe" as const },
}
      : { appearance: { theme: "stripe" as const },
};

  return (
    <Elements
      key={`${clientSecret}-${mode}`}
      stripe={stripe}
      options={options}
    >
      {mode === "staff" ? (
        <StaffCardPaymentForm
          clientSecret={clientSecret}
          onSuccess={() => onSuccess()}
          onError={onError}
        />
      ) : mode === "setup" ? (
        <SetupCardForm
          onSuccess={(setupIntentId) => onSuccess({ setupIntentId })}
          onError={onError}
        />
      ) : (
        <CheckoutPaymentForm
          onSuccess={() => onSuccess()}
          onError={onError}
        />
      )}
    </Elements>
  );
}
