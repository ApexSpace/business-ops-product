"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Gift, Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  createPublicGiftCardCheckout,
  getPublicGiftCardPage,
} from "@/features/gift-cards/api/gift-cards.api";
import type { GiftCardPromotion } from "@/features/gift-cards/types";
import { EmbeddedStripePayment } from "@/features/payments/payments-kit/embedded-stripe-payment";
import {
  formatGiftCardAmount,
  GIFT_CARD_ONLINE_MAX_AMOUNT,
  GIFT_CARD_ONLINE_MIN_AMOUNT,
} from "@/features/gift-cards/utils/gift-card-url";
import { normalizeGiftCardArtworkUrl } from "@/features/gift-cards/utils/gift-card-artwork";

type PurchaseStep = "details" | "payment" | "success";
type PurchaseFor = "someone_else" | "yourself";

interface PublicGiftCardPurchaseProps {
  slug: string;
  embed?: boolean;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function GiftCardArtworkPreview({
  artworkUrl,
  businessName,
}: {
  artworkUrl?: string | null;
  businessName: string;
}) {
  const src = normalizeGiftCardArtworkUrl(artworkUrl);
  const usable =
    src &&
    (src.startsWith("http") || src.startsWith("/"))
      ? src
      : null;

  return (
    <div className="relative mx-auto aspect-[1.6/1] w-full max-w-sm overflow-hidden rounded-lg shadow-md">
      {usable ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={usable}
          alt={`${businessName} gift card`}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-gradient-to-br from-emerald-800 to-emerald-950">
          <div className="rounded border border-white/80 px-8 py-6 text-center">
            <p className="text-xs tracking-widest text-white/80">FOR YOU</p>
            <p className="mt-2 text-2xl font-bold tracking-wide text-white">
              GIFT CARD
            </p>
            <p className="mt-2 text-xs tracking-widest text-white/80">FOR YOU</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function PublicGiftCardPurchase({
  slug,
  embed = false,
}: PublicGiftCardPurchaseProps) {
  const [step, setStep] = useState<PurchaseStep>("details");
  const [purchaseFor, setPurchaseFor] = useState<PurchaseFor>("someone_else");
  const [selectedPromotion, setSelectedPromotion] =
    useState<GiftCardPromotion | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [purchaserFirstName, setPurchaserFirstName] = useState("");
  const [purchaserLastName, setPurchaserLastName] = useState("");
  const [purchaserEmail, setPurchaserEmail] = useState("");
  const [recipientFirstName, setRecipientFirstName] = useState("");
  const [recipientLastName, setRecipientLastName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<{
    clientSecret: string;
    publishableKey: string;
    stripeAccountId: string;
    salePrice: string;
    cardValue: string;
    recipientEmail: string;
  } | null>(null);

  const pageQuery = useQuery({
    queryKey: ["public-gift-cards", slug],
    queryFn: () => getPublicGiftCardPage(slug),
  });

  const checkoutMutation = useMutation({
    mutationFn: () => {
      const purchaserName = `${purchaserFirstName.trim()} ${purchaserLastName.trim()}`.trim();
      const recipientName =
        purchaseFor === "yourself"
          ? purchaserName
          : `${recipientFirstName.trim()} ${recipientLastName.trim()}`.trim();
      const finalRecipientEmail =
        purchaseFor === "yourself" ? purchaserEmail.trim() : recipientEmail.trim();

      return createPublicGiftCardCheckout(slug, {
        promotionId: selectedPromotion?.id,
        customAmount: selectedPromotion ? undefined : Number(customAmount),
        recipientName,
        recipientEmail: finalRecipientEmail,
        purchaserName,
        purchaserEmail: purchaserEmail.trim(),
        giftMessage: giftMessage.trim() || undefined,
      });
    },
    onSuccess: (data) => {
      if (!data.publishableKey) {
        toast.error("Payment processing is not configured.");
        return;
      }
      const finalRecipientEmail =
        purchaseFor === "yourself" ? purchaserEmail.trim() : recipientEmail.trim();
      setPaymentConfig({
        clientSecret: data.clientSecret,
        publishableKey: data.publishableKey,
        stripeAccountId: data.stripeAccountId,
        salePrice: data.salePrice,
        cardValue: data.cardValue,
        recipientEmail: finalRecipientEmail,
      });
      setStep("payment");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (pageQuery.isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (pageQuery.isError || !pageQuery.data) {
    return (
      <div className="flex min-h-svh items-center justify-center p-8 text-center">
        <p className="text-muted-foreground">Gift cards are not available.</p>
      </div>
    );
  }

  const { business, settings, activePromotions, stripeReady } = pageQuery.data;
  const minAmount = settings.minAmount ?? GIFT_CARD_ONLINE_MIN_AMOUNT;
  const maxAmount = settings.maxAmount ?? GIFT_CARD_ONLINE_MAX_AMOUNT;
  const salePrice = selectedPromotion
    ? selectedPromotion.salePrice
    : customAmount || "0";
  const cardValue = selectedPromotion
    ? selectedPromotion.cardValue
    : customAmount || "0";

  function validateDetails(): boolean {
    if (!purchaserFirstName.trim() || !purchaserLastName.trim()) {
      toast.error("Please enter your first and last name.");
      return false;
    }
    if (!isValidEmail(purchaserEmail)) {
      toast.error("Please enter a valid email for your receipt.");
      return false;
    }
    if (!selectedPromotion) {
      const amount = Number(customAmount);
      if (!customAmount || Number.isNaN(amount)) {
        toast.error("Please enter a gift card amount.");
        return false;
      }
      if (amount < minAmount || amount > maxAmount) {
        toast.error(`Amount must be between $${minAmount} and $${maxAmount}.`);
        return false;
      }
    }
    if (purchaseFor === "someone_else") {
      if (!recipientFirstName.trim() || !recipientLastName.trim()) {
        toast.error("Please enter the recipient's first and last name.");
        return false;
      }
      if (!isValidEmail(recipientEmail)) {
        toast.error("Please enter a valid recipient email.");
        return false;
      }
    }
    if (!stripeReady) {
      toast.error("Online payments are not available for this business.");
      return false;
    }
    return true;
  }

  if (step === "success") {
    return (
      <div
        className={cn(
          "mx-auto max-w-lg space-y-6 p-6 text-center",
          embed ? "min-h-0" : "min-h-svh py-12",
        )}
      >
        <h1 className="text-2xl font-semibold">Thank you!</h1>
        <p className="text-muted-foreground">
          Your gift card purchase was successful. A gift card will be sent to{" "}
          <span className="font-medium text-foreground">
            {paymentConfig?.recipientEmail}
          </span>{" "}
          shortly.
        </p>
      </div>
    );
  }

  if (step === "payment" && paymentConfig) {
    return (
      <div
        className={cn(
          "mx-auto max-w-lg space-y-6 p-6",
          embed ? "min-h-0" : "min-h-svh py-8",
        )}
      >
        <header className="text-center">
          <h1 className="text-2xl font-semibold">{business.name}</h1>
        </header>

        <GiftCardArtworkPreview
          artworkUrl={settings.artworkUrl}
          businessName={business.name}
        />

        <div className="text-center">
          <p className="text-sm text-muted-foreground">Amount due:</p>
          <p className="text-3xl font-bold text-primary">
            ${formatGiftCardAmount(paymentConfig.salePrice)}
          </p>
          <button
            type="button"
            className="mt-1 inline-flex items-center gap-1 text-sm text-primary underline"
            onClick={() => setShowDetails((v) => !v)}
          >
            Gift card details
            {showDetails ? (
              <NavArrowIcon direction="up" size="md" />
            ) : (
              <NavArrowIcon direction="down" size="md" />
            )}
          </button>
          {showDetails ? (
            <div className="mt-3 rounded-md border bg-muted/30 p-3 text-left text-sm">
              <p>
                <span className="text-muted-foreground">Card value:</span> $
                {formatGiftCardAmount(paymentConfig.cardValue)}
              </p>
              <p>
                <span className="text-muted-foreground">Send to:</span>{" "}
                {paymentConfig.recipientEmail}
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-4 border-t pt-4">
          <h2 className="text-sm font-medium">
            Enter your billing address and credit card
          </h2>
          <EmbeddedStripePayment
            publishableKey={paymentConfig.publishableKey}
            clientSecret={paymentConfig.clientSecret}
            stripeAccountId={paymentConfig.stripeAccountId}
            mode="checkout"
            onSuccess={() => setStep("success")}
            onError={(message) => toast.error(message)}
          />
          <p className="text-center text-sm text-muted-foreground">
            A gift card with the value of $
            {formatGiftCardAmount(paymentConfig.cardValue)} will be sent to{" "}
            {paymentConfig.recipientEmail} immediately.
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => setStep("details")}
        >
          Back
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto max-w-lg space-y-6 p-6",
        embed ? "min-h-0" : "min-h-svh py-8",
      )}
    >
      <header className="text-center">
        <h1 className="text-2xl font-semibold">{business.name}</h1>
      </header>

      <GiftCardArtworkPreview
        artworkUrl={settings.artworkUrl}
        businessName={business.name}
      />

      <div className="space-y-2">
        <Label className="text-sm font-medium">Purchase for:</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
              purchaseFor === "someone_else"
                ? "border-primary bg-primary/5 text-primary"
                : "hover:bg-muted/50",
            )}
            onClick={() => setPurchaseFor("someone_else")}
          >
            <Gift className="size-4" />
            Someone else
          </button>
          <button
            type="button"
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
              purchaseFor === "yourself"
                ? "border-primary bg-primary/5 text-primary"
                : "hover:bg-muted/50",
            )}
            onClick={() => setPurchaseFor("yourself")}
          >
            <Heart className="size-4" />
            Yourself
          </button>
        </div>
      </div>

      {activePromotions.length > 0 ? (
        <div className="space-y-2">
          <Label>Select a promotion</Label>
          <div className="grid gap-2">
            {activePromotions.map((promo) => (
              <button
                key={promo.id}
                type="button"
                className={cn(
                  "rounded-lg border p-3 text-left text-sm transition-colors",
                  selectedPromotion?.id === promo.id
                    ? "border-primary ring-2 ring-primary"
                    : "hover:bg-muted/50",
                )}
                onClick={() => {
                  setSelectedPromotion(promo);
                  setCustomAmount("");
                }}
              >
                <p className="font-medium">{promo.name}</p>
                {promo.description ? (
                  <p className="text-muted-foreground">{promo.description}</p>
                ) : null}
                <p className="mt-1">
                  ${promo.cardValue} value — ${promo.salePrice}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!selectedPromotion ? (
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            min={minAmount}
            max={maxAmount}
            step="0.01"
            placeholder={`Enter amount ($${minAmount} - $${maxAmount})`}
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
          />
        </div>
      ) : null}

      <div className="space-y-4 border-t pt-4">
        <h2 className="text-sm font-medium">Your details</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="purchaser-first">First name</Label>
            <Input
              id="purchaser-first"
              placeholder="Required"
              value={purchaserFirstName}
              onChange={(e) => setPurchaserFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchaser-last">Last name</Label>
            <Input
              id="purchaser-last"
              placeholder="Required"
              value={purchaserLastName}
              onChange={(e) => setPurchaserLastName(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="purchaser-email">Your email (for the receipt)</Label>
          <Input
            id="purchaser-email"
            type="email"
            placeholder="Required"
            value={purchaserEmail}
            onChange={(e) => setPurchaserEmail(e.target.value)}
          />
        </div>
      </div>

      {purchaseFor === "someone_else" ? (
        <div className="space-y-4 border-t pt-4">
          <h2 className="text-sm font-medium">Recipient details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="recipient-first">First name</Label>
              <Input
                id="recipient-first"
                placeholder="Required"
                value={recipientFirstName}
                onChange={(e) => setRecipientFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipient-last">Last name</Label>
              <Input
                id="recipient-last"
                placeholder="Required"
                value={recipientLastName}
                onChange={(e) => setRecipientLastName(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gift-message">Gift message</Label>
            <Textarea
              id="gift-message"
              placeholder="Enter an optional gift message"
              rows={3}
              value={giftMessage}
              onChange={(e) => setGiftMessage(e.target.value)}
            />
          </div>
          <div className="space-y-4 border-t pt-4">
            <h2 className="text-sm font-medium">Send to</h2>
            <div className="space-y-2">
              <Label htmlFor="recipient-email">
                What email address should we send this gift card to?
              </Label>
              <Input
                id="recipient-email"
                type="email"
                placeholder="Required"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Gift card will be sent immediately after successful payment.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {settings.disclaimer ? (
        <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          {settings.disclaimer}
        </div>
      ) : null}

      {!stripeReady ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          Online payments are not available. Please contact the business directly.
        </div>
      ) : null}

      <Button
        className="w-full"
        size="lg"
        disabled={checkoutMutation.isPending || !stripeReady}
        onClick={() => {
          if (!validateDetails()) return;
          checkoutMutation.mutate();
        }}
      >
        {checkoutMutation.isPending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading…
          </>
        ) : (
          `Continue — $${formatGiftCardAmount(salePrice)}`
        )}
      </Button>
    </div>
  );
}
