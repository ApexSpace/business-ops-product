"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getPublicPackageCheckout,
  initiatePublicPackageCheckout,
} from "@/features/packages/api/packages.api";
import { EmbeddedStripePayment } from "@/features/payments/payments-kit/embedded-stripe-payment";

type Step = "details" | "checkout" | "success";

interface PublicPackagePurchaseProps {
  slug: string;
  templateId: string;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function PublicPackagePurchase({
  slug,
  templateId,
}: PublicPackagePurchaseProps) {
  const [step, setStep] = useState<Step>("details");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<{
    clientSecret: string;
    publishableKey: string;
    stripeAccountId: string;
    totalPrice: string;
  } | null>(null);

  const pageQuery = useQuery({
    queryKey: ["public-package", slug, templateId],
    queryFn: () => getPublicPackageCheckout(slug, templateId),
  });

  const checkoutMutation = useMutation({
    mutationFn: () =>
      initiatePublicPackageCheckout(slug, templateId, {
        firstName,
        lastName,
        email,
        phone: phone || undefined,
      }),
    onSuccess: (data) => {
      if (!data.publishableKey) {
        toast.error("Payment is not configured");
        return;
      }
      setPaymentConfig({
        clientSecret: data.clientSecret,
        publishableKey: data.publishableKey,
        stripeAccountId: data.stripeAccountId,
        totalPrice: data.totalPrice,
      });
      setStep("checkout");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const data = pageQuery.data;
  const pkg = data?.package;

  if (pageQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  if (!data || !pkg) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-muted-foreground">This package is not available.</p>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border bg-background p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Purchase complete</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Thank you! A confirmation email will be sent shortly.
          </p>
          <p className="mt-4 font-medium">
            {pkg.emoji} {pkg.name}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 flex min-h-screen justify-center p-4">
      <div className="w-full max-w-[480px] rounded-xl border bg-background shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <p className="font-semibold">{data.business.name}</p>
          <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
            Powered by CodeSol
          </p>
        </div>

        {step === "details" ? (
          <div className="space-y-5 p-5">
            <h2 className="text-center text-sm font-medium">Package details</h2>
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-bold">
                {pkg.emoji} {pkg.name}
              </h3>
              <p className="text-lg font-bold">${pkg.totalPrice}</p>
            </div>
            {pkg.shortDescription ? (
              <p className="text-muted-foreground text-sm">{pkg.shortDescription}</p>
            ) : null}
            {pkg.description ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: pkg.description }}
              />
            ) : (
              <div>
                <p className="mb-2 text-sm font-medium">Includes:</p>
                <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
                  {pkg.serviceGroups.map((group) =>
                    group.items.map((item) => (
                      <li key={item.serviceId}>
                        <span className="bg-primary/10 text-primary mr-2 inline-flex size-5 items-center justify-center rounded text-xs font-semibold">
                          {group.quantity}
                        </span>
                        {item.service.name} services
                      </li>
                    )),
                  )}
                </ul>
              </div>
            )}
            <Button className="w-full" onClick={() => setStep("checkout")}>
              Continue
            </Button>
          </div>
        ) : null}

        {step === "checkout" ? (
          <div className="space-y-5 p-5">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setStep("details");
                  setPaymentConfig(null);
                }}
              >
                <ArrowLeft className="size-4" />
              </Button>
              <h2 className="flex-1 text-center text-sm font-medium">Checkout</h2>
              <div className="size-9" />
            </div>

            <div className="text-center">
              <p className="text-muted-foreground text-xs">Amount due today:</p>
              <p className="text-3xl font-bold">${pkg.totalPrice}</p>
              <button
                type="button"
                className="text-primary mt-1 inline-flex items-center gap-1 text-xs underline"
                onClick={() => setShowDetails((v) => !v)}
              >
                Show details
                {showDetails ? (
                  <NavArrowIcon direction="up" size="md" />
                ) : (
                  <NavArrowIcon direction="down" size="md" />
                )}
              </button>
              {showDetails ? (
                <p className="text-muted-foreground mt-2 text-sm">
                  {pkg.emoji} {pkg.name}
                </p>
              ) : null}
            </div>

            {!paymentConfig ? (
              <>
                <div className="space-y-3 border-t pt-4">
                  <p className="text-sm font-medium">Client details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>First name</Label>
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Last name</Label>
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                {pkg.requireAgreement ? (
                  <div className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                    <Checkbox
                      id="agree"
                      checked={agreed}
                      onCheckedChange={(v) => setAgreed(v === true)}
                    />
                    <label htmlFor="agree" className="leading-snug">
                      {pkg.agreementText ?? "I agree to the package terms."}
                    </label>
                  </div>
                ) : null}

                {!data.stripeReady ? (
                  <p className="text-destructive text-sm">
                    Online payments are not available for this business.
                  </p>
                ) : null}

                <Button
                  className="w-full"
                  disabled={
                    !firstName.trim() ||
                    !lastName.trim() ||
                    !isValidEmail(email) ||
                    (pkg.requireAgreement && !agreed) ||
                    !data.stripeReady
                  }
                  onClick={() => checkoutMutation.mutate()}
                >
                  {checkoutMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Continue to payment"
                  )}
                </Button>
              </>
            ) : (
              <div className="space-y-4 border-t pt-4">
                <p className="text-sm font-semibold">
                  A total of ${paymentConfig.totalPrice} will be charged to your
                  card immediately.
                </p>
                <p className="text-muted-foreground text-xs">
                  A confirmation email will be sent after successful payment.
                </p>
                <EmbeddedStripePayment
                  clientSecret={paymentConfig.clientSecret}
                  publishableKey={paymentConfig.publishableKey}
                  stripeAccountId={paymentConfig.stripeAccountId}
                  onSuccess={() => setStep("success")}
                  onError={(message) => toast.error(message)}
                />
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
