"use client";

import { Loader2 } from "lucide-react";
import { PhoneInput } from "@/components/forms/phone-input";
import { Button } from "@/components/ui/button";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { hasPhoneDigits } from "@/lib/forms/phone";
import type { PublicBookingBusiness } from "@/features/public-booking/schemas/public-booking";
import { EmbeddedStripePayment } from "@/features/payments/payments-kit/embedded-stripe-payment";

type DetailsStep = "form" | "payment";

interface BookingPaymentConfig {
  clientSecret: string;
  publishableKey: string;
  stripeAccountId: string;
  amountLabel: string;
}

interface BookingDetailsFormProps {
  business: PublicBookingBusiness;
  calendar?: PublicBookingBusiness;
  accentColor: string;
  summary: { dateLabel: string; timeLabel: string; durationLabel: string };
  serviceSummaries?: Array<{
    serviceName: string;
    staffName: string;
    timeLabel: string;
    price?: string | null;
  }>;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
  homeAddress?: string;
  requireHomeAddress?: boolean;
  paymentRequired?: boolean;
  servicePrice?: string | null;
  detailsStep?: DetailsStep;
  paymentConfig?: BookingPaymentConfig | null;
  bookForSomeoneElse?: boolean;
  bookedForFirstName?: string;
  bookedForLastName?: string;
  bookedForEmail?: string;
  policyAgreed?: boolean;
  reminderOptIn?: boolean;
  showOfferCode?: boolean;
  offerCode?: string;
  validatedOfferName?: string | null;
  submitting: boolean;
  checkoutLoading?: boolean;
  submitError?: string | null;
  onBack: () => void;
  onChange: (field: string, value: string) => void;
  onValidateOfferCode?: () => void;
  onSubmit: () => void;
  onPaymentSuccess: () => void;
  onPaymentError: (message: string) => void;
  compact?: boolean;
}

export function BookingDetailsForm({
  business,
  calendar,
  accentColor,
  summary,
  serviceSummaries = [],
  customerName,
  customerEmail,
  customerPhone,
  notes,
  homeAddress = "",
  requireHomeAddress = false,
  paymentRequired = false,
  servicePrice = null,
  detailsStep = "form",
  paymentConfig = null,
  bookForSomeoneElse = false,
  bookedForFirstName = "",
  bookedForLastName = "",
  bookedForEmail = "",
  policyAgreed = false,
  reminderOptIn = true,
  showOfferCode = false,
  offerCode = "",
  validatedOfferName = null,
  submitting,
  checkoutLoading = false,
  submitError = null,
  onBack,
  onChange,
  onValidateOfferCode,
  onSubmit,
  onPaymentSuccess,
  onPaymentError,
  compact = false,
}: BookingDetailsFormProps) {
  const data = business ?? calendar!;
  const fs = data.formSettings;
  const showBookForSomeoneElse = fs.showBookForSomeoneElse !== false;
  const canSubmit =
    customerName.trim().length > 0 &&
    (!fs.requireEmail || customerEmail.trim().length > 0) &&
    (!fs.requirePhone || hasPhoneDigits(customerPhone)) &&
    (!requireHomeAddress || homeAddress.trim().length > 0) &&
    (!fs.requirePolicyAgreement || policyAgreed) &&
    (!bookForSomeoneElse || bookedForEmail.trim().includes("@"));

  const scheduleLabel = data.buttonText || "Book now";
  const continueLabel = paymentRequired ? "Continue to payment" : scheduleLabel;
  const showLineSummaries = serviceSummaries.length > 1;

  const summaryBlock = showLineSummaries ? (
    <div className="rounded-lg border bg-muted/30 px-4 py-3.5 text-sm">
      <p className="font-medium">{summary.dateLabel}</p>
      <div className="mt-3 space-y-3">
        {serviceSummaries.map((line) => (
          <div key={`${line.serviceName}-${line.timeLabel}`}>
            <p className="font-medium">
              {line.serviceName}
              {line.price ? ` ($${line.price})` : ""}
            </p>
            <p className="text-muted-foreground">
              with {line.staffName} at {line.timeLabel}
            </p>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <div className="rounded-lg border bg-muted/30 px-4 py-3.5 text-sm">
      <p className="font-medium">{summary.dateLabel}</p>
      <p className="mt-1 text-muted-foreground">
        {summary.timeLabel} · {summary.durationLabel}
      </p>
    </div>
  );

  if (detailsStep === "payment" && paymentConfig) {
    return (
      <div
        className={cn(
          "flex h-full flex-col",
          compact
            ? "min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3"
            : "p-4 sm:p-6 lg:p-8",
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("-ml-2 h-9 w-fit", compact ? "mb-1.5" : "mb-3")}
          onClick={onBack}
        >
          <NavArrowIcon direction="left" size="lg" className="mr-1" />
          Back
        </Button>

        <div className="space-y-4">
          {summaryBlock}

          <p className="text-sm font-semibold">
            A total of {paymentConfig.amountLabel} will be charged to your card
            to complete this booking.
          </p>

          <EmbeddedStripePayment
            mode="checkout"
            publishableKey={paymentConfig.publishableKey}
            clientSecret={paymentConfig.clientSecret}
            stripeAccountId={paymentConfig.stripeAccountId}
            onSuccess={onPaymentSuccess}
            onError={onPaymentError}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col",
        compact
          ? "min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3"
          : "p-4 sm:p-6 lg:p-8",
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("-ml-2 h-9 w-fit", compact ? "mb-1.5" : "mb-3")}
        onClick={onBack}
      >
        <NavArrowIcon direction="left" size="lg" className="mr-1" />
        Back
      </Button>

      <div className={cn(!compact && "space-y-6")}>
        {!compact ? (
          <div className="mb-6 lg:hidden">{summaryBlock}</div>
        ) : null}

        <form
          className={cn(compact ? "space-y-4" : "space-y-5")}
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) onSubmit();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="pb-name">Name *</Label>
            <Input
              id="pb-name"
              value={customerName}
              onChange={(e) => onChange("customerName", e.target.value)}
              className="h-11"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pb-email">Email{fs.requireEmail ? " *" : ""}</Label>
            <Input
              id="pb-email"
              type="email"
              value={customerEmail}
              onChange={(e) => onChange("customerEmail", e.target.value)}
              className="h-11"
              required={fs.requireEmail}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pb-phone">Phone{fs.requirePhone ? " *" : ""}</Label>
            <PhoneInput
              id="pb-phone"
              value={customerPhone || null}
              onChange={(value) => onChange("customerPhone", value ?? "")}
              showClear={false}
            />
          </div>

          {requireHomeAddress ? (
            <div className="space-y-1.5">
              <Label htmlFor="pb-home-address">Home address *</Label>
              <Input
                id="pb-home-address"
                value={homeAddress}
                onChange={(e) => onChange("homeAddress", e.target.value)}
                className="h-11"
                placeholder="Street address, city, state"
                required
              />
            </div>
          ) : null}

          {showBookForSomeoneElse ? (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="book-for-other"
                  checked={bookForSomeoneElse}
                  onCheckedChange={(v) =>
                    onChange("bookForSomeoneElse", String(Boolean(v)))
                  }
                />
                <Label htmlFor="book-for-other">I am booking for someone else</Label>
              </div>
              {bookForSomeoneElse ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    placeholder="First name"
                    value={bookedForFirstName}
                    onChange={(e) =>
                      onChange("bookedForFirstName", e.target.value)
                    }
                  />
                  <Input
                    placeholder="Last name"
                    value={bookedForLastName}
                    onChange={(e) =>
                      onChange("bookedForLastName", e.target.value)
                    }
                  />
                  <Input
                    type="email"
                    placeholder="Email *"
                    className="sm:col-span-2"
                    value={bookedForEmail}
                    onChange={(e) =>
                      onChange("bookedForEmail", e.target.value)
                    }
                    required
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {fs.showNotes ? (
            <div className="space-y-1.5">
              <Label htmlFor="pb-notes">Comments</Label>
              <Textarea
                id="pb-notes"
                rows={3}
                value={notes}
                onChange={(e) => onChange("notes", e.target.value)}
                placeholder="Enter any comments"
              />
            </div>
          ) : null}

          {fs.cancellationPolicyText ? (
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3 text-sm">
              <p className="font-medium">Cancellation policy</p>
              <p className="text-muted-foreground">{fs.cancellationPolicyText}</p>
              {fs.requirePolicyAgreement ? (
                <div className="flex items-start gap-2 pt-1">
                  <Checkbox
                    id="policy-agree"
                    checked={policyAgreed}
                    onCheckedChange={(v) =>
                      onChange("policyAgreed", String(Boolean(v)))
                    }
                  />
                  <Label htmlFor="policy-agree" className="font-normal leading-snug">
                    I agree to the cancellation policy
                  </Label>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Would you like to receive appointment reminders?
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="reminder"
                  checked={reminderOptIn}
                  onChange={() => onChange("reminderOptIn", "true")}
                />
                Yes, send appointment reminders
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="reminder"
                  checked={!reminderOptIn}
                  onChange={() => onChange("reminderOptIn", "false")}
                />
                No, do not send appointment reminders
              </label>
            </div>
          </div>

          {showOfferCode ? (
            <div className="space-y-2">
              <Label htmlFor="offer-code">Have an offer code?</Label>
              <div className="flex gap-2">
                <Input
                  id="offer-code"
                  value={offerCode}
                  onChange={(e) =>
                    onChange("offerCode", e.target.value.toUpperCase())
                  }
                  className="uppercase"
                />
                {onValidateOfferCode ? (
                  <Button type="button" variant="outline" onClick={onValidateOfferCode}>
                    Apply
                  </Button>
                ) : null}
              </div>
              {validatedOfferName ? (
                <p className="text-sm text-emerald-700">
                  Offer applied: {validatedOfferName}
                </p>
              ) : null}
            </div>
          ) : null}

          {submitError ? (
            <p className="text-sm text-destructive" role="alert">
              {submitError}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={!canSubmit || submitting || checkoutLoading}
            className="h-11 w-full font-semibold text-white"
            style={{ backgroundColor: accentColor }}
          >
            {submitting || checkoutLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {checkoutLoading ? "Preparing payment…" : "Scheduling…"}
              </>
            ) : (
              continueLabel
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
