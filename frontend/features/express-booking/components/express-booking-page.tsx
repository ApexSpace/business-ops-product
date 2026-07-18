"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/forms/phone-input";
import { EmbeddedStripePayment } from "@/features/payments/payments-kit/embedded-stripe-payment";
import {
  completeExpressBooking,
  createExpressCheckout,
  getExpressBooking,
  type ExpressBookingSummary,
  type ExpressCompleteBody,
} from "@/features/express-booking/api/express-booking.api";
import { ApiClientError } from "@/lib/api/errors";
import { hasPhoneDigits, parseE164Phone, toE164Phone } from "@/lib/forms/phone";
import { cn } from "@/lib/utils";

function staffLabel(staff: {
  firstName: string | null;
  lastName: string | null;
}): string {
  const name = [staff.firstName, staff.lastName].filter(Boolean).join(" ");
  return name || "Staff";
}

function formatWhen(iso: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

function formatPhoneDisplay(
  countryCode: string | null | undefined,
  number: string | null | undefined,
): string | null {
  if (!number?.trim()) return null;
  const dial = countryCode?.startsWith("+")
    ? countryCode
    : countryCode
      ? `+${countryCode}`
      : null;
  return dial ? `${dial} ${number}` : number;
}

function contactDisplayName(summary: ExpressBookingSummary): string {
  if (summary.contact) {
    const name = [summary.contact.firstName, summary.contact.lastName]
      .filter(Boolean)
      .join(" ");
    if (name) return name;
  }
  return summary.guestFirstName?.trim() || "Guest";
}

function contactDisplayEmail(summary: ExpressBookingSummary): string | null {
  return summary.contact?.email ?? summary.guestEmail;
}

function contactDisplayPhone(summary: ExpressBookingSummary): string | null {
  if (summary.contact?.phoneNumber) {
    return formatPhoneDisplay(
      summary.contact.phoneCountryCode,
      summary.contact.phoneNumber,
    );
  }
  return formatPhoneDisplay(
    summary.guestPhoneCountryCode,
    summary.guestPhone,
  );
}

export function ExpressBookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [assignedToId, setAssignedToId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerLastName, setCustomerLastName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [notes, setNotes] = useState("");
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [step, setStep] = useState<"form" | "payment" | "success">("form");
  const [holdToken, setHoldToken] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [completedStatus, setCompletedStatus] = useState<string | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<{
    mode: "checkout" | "setup";
    clientSecret: string;
    publishableKey: string;
    stripeAccountId: string;
    amountLabel: string | null;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const query = useQuery({
    queryKey: ["express-booking", token],
    queryFn: () => getExpressBooking(token),
    retry: false,
  });

  const summary = query.data;

  useEffect(() => {
    if (!summary || initialized) return;
    setAssignedToId(summary.assignedToId);
    if (!summary.hasExistingContact) {
      setCustomerName(summary.guestFirstName ?? "");
      setCustomerEmail(summary.guestEmail ?? "");
      if (summary.guestPhone) {
        const dial = summary.guestPhoneCountryCode?.startsWith("+")
          ? summary.guestPhoneCountryCode
          : summary.guestPhoneCountryCode
            ? `+${summary.guestPhoneCountryCode}`
            : "+1";
        setCustomerPhone(
          toE164Phone(dial, summary.guestPhone) ?? summary.guestPhone,
        );
      }
    }
    setInitialized(true);
  }, [summary, initialized]);

  const availableStaff = useMemo(
    () => (summary?.staff ?? []).filter((s) => s.available),
    [summary?.staff],
  );

  const policyRequired = Boolean(
    summary?.formSettings.cancellationPolicyText ||
      summary?.formSettings.requirePolicyAgreement,
  );

  function buildGuestPayload(
    selectedStaff: string,
  ): Omit<ExpressCompleteBody, "paymentIntentId" | "setupIntentId" | "holdToken"> {
    const parsedPhone = parseE164Phone(customerPhone);
    return {
      customerName: customerName.trim(),
      customerLastName: customerLastName.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      companyName: companyName.trim() || undefined,
      phoneCountryCode: parsedPhone?.dialCode,
      phoneNumber: parsedPhone?.nationalDigits,
      notes: notes.trim() || undefined,
      assignedToId: selectedStaff,
      policyAgreed,
    };
  }

  function validateForm(current: ExpressBookingSummary): string | null {
    const selectedStaff = assignedToId ?? current.assignedToId;
    if (!selectedStaff) return "Select a staff member";

    if (!current.hasExistingContact) {
      if (!customerName.trim()) return "Enter your first name";
      if (current.formSettings.requireEmail && !customerEmail.trim()) {
        return "Email is required";
      }
      if (current.formSettings.requirePhone && !hasPhoneDigits(customerPhone)) {
        return "Phone number is required";
      }
    }

    if (policyRequired && !policyAgreed) {
      return "Please agree to the cancellation policy";
    }

    return null;
  }

  const completeMutation = useMutation({
    mutationFn: async (payment?: {
      holdToken?: string | null;
      paymentIntentId?: string;
      setupIntentId?: string;
    }) => {
      if (!summary) throw new Error("Missing booking");
      const validationError = validateForm(summary);
      if (validationError) throw new Error(validationError);

      const selectedStaff = (assignedToId ?? summary.assignedToId)!;

      const body: ExpressCompleteBody = summary.hasExistingContact
        ? {
            assignedToId: selectedStaff,
            policyAgreed,
            notes: notes.trim() || undefined,
            paymentIntentId: payment?.paymentIntentId,
            setupIntentId: payment?.setupIntentId,
            holdToken: payment?.holdToken ?? undefined,
          }
        : {
            ...buildGuestPayload(selectedStaff),
            paymentIntentId: payment?.paymentIntentId,
            setupIntentId: payment?.setupIntentId,
            holdToken: payment?.holdToken ?? undefined,
          };

      return completeExpressBooking(token, body);
    },
    onSuccess: (result) => {
      setCompletedStatus(result.status);
      setStep("success");
      setSubmitError(null);
    },
    onError: (error) => {
      setSubmitError(
        error instanceof ApiClientError || error instanceof Error
          ? error.message
          : "Could not complete booking",
      );
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (mode: "deposit" | "card") => {
      if (!summary) throw new Error("Missing booking");
      const validationError = validateForm(summary);
      if (validationError) throw new Error(validationError);

      const selectedStaff = assignedToId ?? summary.assignedToId ?? undefined;
      const parsedPhone = parseE164Phone(customerPhone);

      const checkout = await createExpressCheckout(token, {
        ...(summary.hasExistingContact
          ? {}
          : {
              customerName: customerName.trim() || undefined,
              customerEmail: customerEmail.trim() || undefined,
              phoneCountryCode: parsedPhone?.dialCode,
              phoneNumber: parsedPhone?.nationalDigits,
            }),
        assignedToId: selectedStaff,
      });

      if (
        !checkout.clientSecret ||
        !checkout.publishableKey ||
        !checkout.stripeAccountId
      ) {
        throw new Error(
          mode === "card"
            ? "Card setup could not be started"
            : "Payment could not be started",
        );
      }

      setHoldToken(checkout.holdToken);
      setPaymentIntentId(checkout.paymentIntentId ?? null);
      setPaymentConfig({
        mode: mode === "card" ? "setup" : "checkout",
        clientSecret: checkout.clientSecret,
        publishableKey: checkout.publishableKey,
        stripeAccountId: checkout.stripeAccountId,
        amountLabel:
          mode === "deposit" && checkout.amountCents > 0
            ? `$${(checkout.amountCents / 100).toFixed(2)}`
            : null,
      });
      setStep("payment");
    },
    onError: (error) => {
      setSubmitError(
        error instanceof ApiClientError || error instanceof Error
          ? error.message
          : "Could not start checkout",
      );
    },
  });

  if (query.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (query.isError || !summary) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Link unavailable
        </h1>
        <p className="mt-2 text-muted-foreground">
          {query.error instanceof Error
            ? query.error.message
            : "This Express Booking link is invalid or has expired."}
        </p>
      </div>
    );
  }

  if (step === "success") {
    const isConfirmed = completedStatus === "CONFIRMED";
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {isConfirmed ? "Booking confirmed" : "Booking received"}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          {isConfirmed
            ? `Thanks — your appointment with ${summary.businessName} is confirmed.`
            : `Thanks — your appointment with ${summary.businessName} is unconfirmed for now. The studio will confirm it shortly.`}
        </p>
        <p className="mt-4 text-sm font-medium text-foreground">
          {summary.service?.name} ·{" "}
          {formatWhen(summary.startAt, summary.timezone)}
        </p>
        {summary.allowPhotoUpload ? (
          <p className="mt-3 text-xs text-muted-foreground">
            You can add photos after your booking is confirmed if the studio
            requests them.
          </p>
        ) : null}
      </div>
    );
  }

  const submitLabel = summary.paymentRequired
    ? "Continue to payment"
    : summary.cardOnly
      ? "Continue to save card"
      : "Complete booking";

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-8">
        <p className="text-sm font-medium text-muted-foreground">
          {summary.businessName}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Complete your booking
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {summary.service?.name} ·{" "}
          {formatWhen(summary.startAt, summary.timezone)}
        </p>
        {summary.expiresAt ? (
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            Complete by {formatWhen(summary.expiresAt, summary.timezone)}
          </p>
        ) : null}
      </div>

      {step === "payment" && paymentConfig ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {paymentConfig.mode === "setup"
              ? "Save a card on file to complete this booking. You will not be charged now."
              : `A total of ${paymentConfig.amountLabel} will be charged to complete this booking.`}
          </p>
          <EmbeddedStripePayment
            mode={paymentConfig.mode}
            clientSecret={paymentConfig.clientSecret}
            publishableKey={paymentConfig.publishableKey}
            stripeAccountId={paymentConfig.stripeAccountId}
            onSuccess={(result) => {
              if (paymentConfig.mode === "setup") {
                const setupIntentId = result?.setupIntentId;
                if (!setupIntentId) {
                  setSubmitError("Card setup did not complete");
                  return;
                }
                void completeMutation.mutateAsync({ setupIntentId });
                return;
              }
              if (!holdToken) return;
              void completeMutation.mutateAsync({
                holdToken,
                paymentIntentId: paymentIntentId ?? undefined,
              });
            }}
            onError={(message) => setSubmitError(message)}
          />
          {submitError ? (
            <p className="text-sm text-destructive">{submitError}</p>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setStep("form");
              setPaymentConfig(null);
            }}
          >
            Back
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Preferred staff</Label>
            <div className="grid gap-2">
              {availableStaff.map((staff) => (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => setAssignedToId(staff.id)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    assignedToId === staff.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  {staffLabel(staff)}
                  {staff.id === summary.assignedToId ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (suggested)
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {summary.hasExistingContact ? (
            <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
              <p className="font-medium text-foreground">
                {contactDisplayName(summary)}
              </p>
              {contactDisplayEmail(summary) ? (
                <p className="text-muted-foreground">
                  {contactDisplayEmail(summary)}
                </p>
              ) : null}
              {contactDisplayPhone(summary) ? (
                <p className="text-muted-foreground">
                  {contactDisplayPhone(summary)}
                </p>
              ) : null}
              {summary.contact?.companyName ? (
                <p className="text-muted-foreground">
                  {summary.contact.companyName}
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="express-first-name">First name</Label>
                  <Input
                    id="express-first-name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    autoComplete="given-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="express-last-name">Last name</Label>
                  <Input
                    id="express-last-name"
                    value={customerLastName}
                    onChange={(e) => setCustomerLastName(e.target.value)}
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="express-email">Email</Label>
                <Input
                  id="express-email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <PhoneInput
                  value={customerPhone || null}
                  onChange={(value) => setCustomerPhone(value ?? "")}
                  showClear={false}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="express-company">Company</Label>
                <Input
                  id="express-company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  autoComplete="organization"
                />
              </div>

              {summary.formSettings.showNotes ? (
                <div className="space-y-2">
                  <Label htmlFor="express-notes">Notes</Label>
                  <Textarea
                    id="express-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              ) : null}
            </>
          )}

          {policyRequired ? (
            <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
              {summary.formSettings.cancellationPolicyText ? (
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {summary.formSettings.cancellationPolicyText}
                </p>
              ) : null}
              <div className="flex items-start gap-2">
                <Checkbox
                  id="express-policy"
                  checked={policyAgreed}
                  onCheckedChange={(v) => setPolicyAgreed(v === true)}
                />
                <Label htmlFor="express-policy" className="text-sm font-normal">
                  I agree to the cancellation policy
                </Label>
              </div>
            </div>
          ) : null}

          {summary.allowPhotoUpload ? (
            <p className="text-xs text-muted-foreground">
              Photos can be added after you complete this booking if requested.
            </p>
          ) : null}

          {submitError ? (
            <p className="text-sm text-destructive">{submitError}</p>
          ) : null}

          <Button
            type="button"
            className="w-full"
            disabled={
              checkoutMutation.isPending || completeMutation.isPending
            }
            onClick={() => {
              setSubmitError(null);
              if (summary.paymentRequired) {
                checkoutMutation.mutate("deposit");
              } else if (summary.cardOnly) {
                checkoutMutation.mutate("card");
              } else {
                completeMutation.mutate(undefined);
              }
            }}
          >
            {checkoutMutation.isPending || completeMutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Submitting…
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
