"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FormDefinition, FormField } from "@/features/forms/types";
import { FieldRenderer } from "@/features/forms/components/builder/field-renderer";
import { EmbeddedStripePayment } from "@/features/payments/payments-kit/embedded-stripe-payment";
import {
  SETTINGS_FORM_DESCRIPTION_CLASS,
  SETTINGS_FORM_SECTION_HEADER_CLASS,
  SETTINGS_FORM_SURFACE_CLASS,
  SETTINGS_GROUP_TITLE_CLASS,
  SETTINGS_PANEL_TITLE_CLASS,
} from "@/lib/design/settings-form-tokens";
import {
  getFormContainerClass,
  getFormContainerStyle,
  getSubmitButtonClass,
  getSubmitButtonStyle,
} from "@/features/forms/utils/field-style.util";
import {
  collectRuntimeFormData,
  mapSubmissionErrors,
  validateRuntimeFormSubmission,
} from "@/features/forms/utils/form-submission-validation.util";
import { createPublicFormPaymentIntent } from "@/features/public-forms/api/public-forms.api";

function findCollectPaymentField(fields: FormField[]): FormField | null {
  for (const field of fields) {
    if (field.type === "collect_payment") return field;
    if (field.type === "columns" && field.columns) {
      for (const column of field.columns) {
        const nested = findCollectPaymentField(column);
        if (nested) return nested;
      }
    }
  }
  return null;
}

interface FormRuntimeViewProps {
  definition: FormDefinition;
  submitted: boolean;
  isSubmitting?: boolean;
  submitError?: string | null;
  fieldErrors?: Record<string, string>;
  publicKey?: string;
  onSubmit: (
    data: Record<string, unknown>,
    extras?: { paymentIntentId?: string },
  ) => void | Promise<void>;
  onResetSubmitted?: () => void;
  className?: string;
}

type PaymentCheckoutState = {
  clientSecret: string;
  publishableKey: string;
  stripeAccountId: string | null;
  paymentIntentId: string;
  amountCents: number;
  currency: string;
};

export function FormRuntimeView({
  definition,
  submitted,
  isSubmitting = false,
  submitError = null,
  fieldErrors: externalFieldErrors = {},
  publicKey,
  onSubmit,
  onResetSubmitted,
  className,
}: FormRuntimeViewProps) {
  const { settings, fields } = definition;
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pendingData, setPendingData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [paymentCheckout, setPaymentCheckout] =
    useState<PaymentCheckoutState | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const displayedFieldErrors = { ...fieldErrors, ...externalFieldErrors };
  const collectPaymentField = findCollectPaymentField(fields);
  const busy = isSubmitting || paymentBusy;

  return (
    <div
      className={cn(
        "w-full",
        SETTINGS_FORM_SURFACE_CLASS,
        getFormContainerClass(settings),
        className,
      )}
      style={getFormContainerStyle(settings)}
    >
      {submitted ? (
        <div className="space-y-4 py-8 text-center">
          <CheckCircle2 className="mx-auto size-12 text-success" />
          <p className={SETTINGS_GROUP_TITLE_CLASS}>{settings.successMessage}</p>
          {onResetSubmitted ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetSubmitted}
            >
              Back to form
            </Button>
          ) : null}
        </div>
      ) : paymentCheckout && pendingData ? (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className={SETTINGS_GROUP_TITLE_CLASS}>Complete payment</h2>
            <p className={SETTINGS_FORM_DESCRIPTION_CLASS}>
              Amount due:{" "}
              {new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: paymentCheckout.currency,
              }).format(paymentCheckout.amountCents / 100)}
            </p>
          </div>
          {paymentError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {paymentError}
            </div>
          ) : null}
          <EmbeddedStripePayment
            mode="checkout"
            publishableKey={paymentCheckout.publishableKey}
            clientSecret={paymentCheckout.clientSecret}
            stripeAccountId={paymentCheckout.stripeAccountId}
            onSuccess={async () => {
              setPaymentBusy(true);
              setPaymentError(null);
              try {
                await onSubmit(pendingData, {
                  paymentIntentId: paymentCheckout.paymentIntentId,
                });
                setPaymentCheckout(null);
                setPendingData(null);
              } catch (error) {
                setPaymentError(
                  error instanceof Error
                    ? error.message
                    : "Unable to submit after payment",
                );
              } finally {
                setPaymentBusy(false);
              }
            }}
            onError={(message) => setPaymentError(message)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setPaymentCheckout(null);
              setPendingData(null);
              setPaymentError(null);
            }}
          >
            Back to form
          </Button>
        </div>
      ) : (
        <>
          <div className={cn("mb-6", SETTINGS_FORM_SECTION_HEADER_CLASS)}>
            <h2 className={SETTINGS_PANEL_TITLE_CLASS}>{settings.title}</h2>
            {settings.description ? (
              <p className={SETTINGS_FORM_DESCRIPTION_CLASS}>{settings.description}</p>
            ) : null}
          </div>

          <form
            noValidate
            onSubmit={async (event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = collectRuntimeFormData(form, fields);
              const validationErrors = validateRuntimeFormSubmission(fields, data);
              if (validationErrors.length > 0) {
                setFieldErrors(mapSubmissionErrors(validationErrors));
                return;
              }

              setFieldErrors({});
              setPaymentError(null);

              if (collectPaymentField && publicKey) {
                if (
                  typeof collectPaymentField.amount !== "number" ||
                  collectPaymentField.amount <= 0
                ) {
                  setPaymentError("This form payment amount is not configured.");
                  return;
                }
                setPaymentBusy(true);
                try {
                  const intent = await createPublicFormPaymentIntent(publicKey);
                  setPendingData(data);
                  setPaymentCheckout({
                    clientSecret: intent.clientSecret,
                    publishableKey: intent.publishableKey,
                    stripeAccountId: intent.stripeAccountId,
                    paymentIntentId: intent.paymentIntentId,
                    amountCents: intent.amountCents,
                    currency: intent.currency,
                  });
                } catch (error) {
                  setPaymentError(
                    error instanceof Error
                      ? error.message
                      : "Unable to start payment",
                  );
                } finally {
                  setPaymentBusy(false);
                }
                return;
              }

              await onSubmit(data);
            }}
          >
            {submitError || paymentError ? (
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {submitError || paymentError}
              </div>
            ) : null}

            <div>
              {fields.map((field) => (
                <FieldRenderer
                  key={field.id}
                  field={field}
                  settings={settings}
                  showRequiredIndicator={settings.showRequiredIndicator}
                  mode="preview"
                  interactive
                  fieldError={displayedFieldErrors[field.name]}
                  fieldErrors={displayedFieldErrors}
                  publicKey={publicKey}
                />
              ))}
            </div>

            <div
              className={cn(
                "mt-8 flex",
                settings.submitButtonAlign === "center" && "justify-center",
                settings.submitButtonAlign === "right" && "justify-end",
              )}
            >
              <Button
                type="submit"
                variant="brand"
                disabled={busy}
                className={getSubmitButtonClass(settings)}
                style={getSubmitButtonStyle(settings)}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {collectPaymentField ? "Preparing payment…" : "Submitting…"}
                  </>
                ) : collectPaymentField ? (
                  "Continue to payment"
                ) : (
                  settings.submitButtonLabel
                )}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
