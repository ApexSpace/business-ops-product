"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableSelect } from "@/components/forms/searchable-select";
import {
  collectPayment,
  type CollectPaymentResult,
  type PaymentMethod,
} from "@/features/payments/api/payment-collection.api";
import { getContactWallet } from "@/features/contacts/api/contact-workspace.api";
import {
  COLLECT_PAYMENT_METHOD_OPTIONS,
  formatMoney,
} from "@/features/payments/schemas/payment-profile";
import { EmbeddedStripePayment } from "@/features/payments/payments-kit/embedded-stripe-payment";
import {
  formatSavedCardLabel,
  useContactPaymentMethods,
} from "@/features/payments/hooks/use-contact-payment-methods";
import { useStripeConnectStatus } from "@/features/payments/hooks/use-stripe-connect-status";
import { GiftCardPaymentPicker } from "@/features/gift-cards/components/gift-card-payment-picker";
import type { GiftCardListItem } from "@/features/gift-cards/types";
import { SalesPaymentDrawerForm } from "@/features/sales/components/sales-payment-drawer-form";
import { queryKeys } from "@/lib/query/keys";
import { invalidateGiftCards } from "@/lib/query/invalidation";
import {
  DRAWER_FIELD_CONTROL_CLASS,
  DRAWER_FIELD_LABEL_CLASS,
  DRAWER_FORM_FIELD_CLASS,
  DRAWER_FORM_STACK_CLASS,
} from "@/lib/design/drawer-shell-tokens";
import { useDrawerFooterSubmitAction } from "@/lib/hooks/use-drawer-footer-submit-action";
import {
  SALES_DRAWER_FIELD_CLASS,
  SALES_DRAWER_VIEW_FIELD_LABEL_CLASS,
} from "@/features/sales/styles/sales-drawer-tokens";

export interface CollectTenderInput {
  method: PaymentMethod;
  amount: number;
  contactPaymentMethodId?: string;
  giftCardId?: string;
}

export interface InvoiceCollectPaymentPanelProps {
  invoiceId: string;
  contactId: string;
  balanceDue: number;
  /** Used for payment summary / tip base in sales drawer layout. */
  subtotal?: number;
  onComplete: () => void;
  /** When set (e.g. sales close), replaces POST /payments/collect */
  collectOverride?: (tenders: CollectTenderInput[]) => Promise<{
    completed: boolean;
    stripeTenders: CollectPaymentResult["stripeTenders"];
    redirectTenders?: CollectPaymentResult["redirectTenders"];
  }>;
  /** After Stripe confirms on the client, wait for async settlement (webhook). */
  awaitSettlement?: () => Promise<void>;
  successMessage?: string;
  /** Use compact drawer field styles and optional external footer button. */
  embedInDrawer?: boolean;
  hideSubmitButton?: boolean;
  onSubmitActionChange?: (
    action: { label: string; disabled: boolean; onClick: () => void } | null,
  ) => void;
}

export function InvoiceCollectPaymentPanel({
  invoiceId,
  contactId,
  balanceDue,
  subtotal,
  onComplete,
  collectOverride,
  awaitSettlement,
  successMessage = "Payment recorded",
  embedInDrawer = false,
  hideSubmitButton = false,
  onSubmitActionChange,
}: InvoiceCollectPaymentPanelProps) {
  type PendingStripe = CollectPaymentResult["stripeTenders"][number];

  const [primaryMethod, setPrimaryMethod] = useState<PaymentMethod>("CASH");
  const [primaryAmount, setPrimaryAmount] = useState(balanceDue);
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [secondaryMethod, setSecondaryMethod] = useState<PaymentMethod>("STRIPE");
  const [secondaryAmount, setSecondaryAmount] = useState(0);
  const [pendingStripe, setPendingStripe] = useState<PendingStripe | null>(
    null,
  );
  const [savedCardId, setSavedCardId] = useState<string | null>(null);
  const [primaryGiftCardId, setPrimaryGiftCardId] = useState<string | null>(
    null,
  );
  const [secondaryGiftCardId, setSecondaryGiftCardId] = useState<string | null>(
    null,
  );
  const [primaryGiftCard, setPrimaryGiftCard] =
    useState<GiftCardListItem | null>(null);
  const [secondaryGiftCard, setSecondaryGiftCard] =
    useState<GiftCardListItem | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    setPrimaryAmount((current) =>
      balanceDue > 0 ? Math.min(current, balanceDue) : balanceDue,
    );
  }, [balanceDue]);

  const { ready: stripeReady, publishableKey, stripeAccountId } =
    useStripeConnectStatus();
  const { methods: savedCards } = useContactPaymentMethods(
    stripeReady ? contactId : undefined,
  );

  const savedCardItems = useMemo(
    () => [
      { value: "new", label: "Enter new card" },
      ...savedCards.map((card) => ({
        value: card.id,
        label: formatSavedCardLabel(card),
      })),
    ],
    [savedCards],
  );

  const normalizeMethod = (method: PaymentMethod): PaymentMethod =>
    stripeReady && method === "CARD" ? "STRIPE" : method;

  const { data: wallet } = useQuery({
    queryKey: queryKeys.contacts.wallet(contactId),
    queryFn: () => getContactWallet(contactId),
    enabled:
      primaryMethod === "WALLET" ||
      secondaryMethod === "WALLET" ||
      primaryMethod === "GIFT_CARD" ||
      secondaryMethod === "GIFT_CARD",
  });

  const contactGiftCardCount =
    wallet?.giftCards?.filter(
      (c) => c.status === "ACTIVE" && parseFloat(c.balance) > 0,
    ).length ?? 0;

  const methodItems = useMemo(() => {
    return COLLECT_PAYMENT_METHOD_OPTIONS.filter((o) => {
      if (o.value === "STRIPE") return stripeReady;
      if (o.value === "CARD") return !stripeReady;
      return true;
    }).map((o) => ({
      value: o.value,
      label:
        o.value === "STRIPE" && stripeReady
          ? "Card"
          : o.value === "CARD"
            ? "Card (manual entry)"
            : o.label,
    }));
  }, [stripeReady]);

  const collectMutation = useMutation({
    mutationFn: collectPayment,
    onError: (err: Error) => toast.error(err.message),
  });

  const tenders = useMemo(() => {
    const capGiftCardAmount = (
      method: PaymentMethod,
      amount: number,
      card: GiftCardListItem | null,
    ) => {
      if (method !== "GIFT_CARD" || !card) return amount;
      const balance = parseFloat(card.currentBalance);
      return Math.min(amount, balance);
    };

    const rows: CollectTenderInput[] = [];
    const primary = Math.round(primaryAmount * 100) / 100;
    const resolvedPrimary = normalizeMethod(primaryMethod);
    if (primary > 0) {
      rows.push({
        method: resolvedPrimary,
        amount: capGiftCardAmount(resolvedPrimary, primary, primaryGiftCard),
        ...(resolvedPrimary === "STRIPE" && savedCardId && savedCardId !== "new"
          ? { contactPaymentMethodId: savedCardId }
          : {}),
        ...(resolvedPrimary === "GIFT_CARD" && primaryGiftCardId
          ? { giftCardId: primaryGiftCardId }
          : {}),
      });
    }
    if (splitEnabled) {
      const secondary = Math.round(secondaryAmount * 100) / 100;
      const resolvedSecondary = normalizeMethod(secondaryMethod);
      if (secondary > 0) {
        rows.push({
          method: resolvedSecondary,
          amount: capGiftCardAmount(
            resolvedSecondary,
            secondary,
            secondaryGiftCard,
          ),
          ...(resolvedSecondary === "STRIPE" &&
          savedCardId &&
          savedCardId !== "new"
            ? { contactPaymentMethodId: savedCardId }
            : {}),
          ...(resolvedSecondary === "GIFT_CARD" && secondaryGiftCardId
            ? { giftCardId: secondaryGiftCardId }
            : {}),
        });
      }
    }
    return rows;
  }, [
    primaryMethod,
    primaryAmount,
    splitEnabled,
    secondaryMethod,
    secondaryAmount,
    savedCardId,
    primaryGiftCardId,
    secondaryGiftCardId,
    primaryGiftCard,
    secondaryGiftCard,
    stripeReady,
  ]);

  const tenderTotal = tenders.reduce((sum, t) => sum + t.amount, 0);
  const hasStripeTender = tenders.some((t) => t.method === "STRIPE");
  const walletBalance = wallet ? parseFloat(wallet.balance.amount) : null;

  const submitLabel =
    hasStripeTender && savedCardId && savedCardId !== "new"
      ? "Charge saved card"
      : hasStripeTender
        ? "Continue to card"
        : "Record payment";

  const submitDisabled =
    collectMutation.isPending ||
    tenderTotal <= 0 ||
    (hasStripeTender && !stripeReady);

  const handleCollect = useCallback(async () => {
    if (tenderTotal <= 0) {
      toast.error("Enter at least one positive amount");
      return;
    }
    if (tenderTotal > balanceDue + 0.001) {
      toast.error("Tender total exceeds balance due");
      return;
    }

    const missingGiftCard = tenders.some(
      (t) => t.method === "GIFT_CARD" && !t.giftCardId,
    );
    if (missingGiftCard) {
      toast.error("Select a gift card for each gift card payment");
      return;
    }

    try {
      const result = collectOverride
        ? await collectOverride(tenders)
        : await collectMutation.mutateAsync({
            payableType: "INVOICE",
            payableId: invoiceId,
            tenders,
            channel: "STAFF_POS",
            stripeMode: "EMBEDDED",
          });

      if (result.redirectTenders && result.redirectTenders.length > 0) {
        window.location.href = result.redirectTenders[0].checkoutUrl;
        return;
      }

      if (result.stripeTenders.length > 0) {
        setPendingStripe(result.stripeTenders[0]);
        return;
      }

      if (result.completed) {
        if (awaitSettlement) {
          try {
            await awaitSettlement();
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Payment is still processing",
            );
            return;
          }
        }
        await invalidateGiftCards(queryClient);
        await queryClient.invalidateQueries({
          queryKey: queryKeys.contacts.wallet(contactId),
        });
        toast.success(successMessage);
        onComplete();
        return;
      }

      toast.success(successMessage);
      onComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    }
  }, [
    awaitSettlement,
    balanceDue,
    collectMutation,
    collectOverride,
    contactId,
    invoiceId,
    onComplete,
    queryClient,
    successMessage,
    tenderTotal,
    tenders,
  ]);

  useDrawerFooterSubmitAction(
    Boolean(hideSubmitButton && onSubmitActionChange && !pendingStripe),
    submitLabel,
    submitDisabled,
    () => {
      void handleCollect();
    },
    onSubmitActionChange,
  );

  const fieldLabelClass = embedInDrawer ? DRAWER_FIELD_LABEL_CLASS : undefined;
  const fieldControlClass = embedInDrawer ? DRAWER_FIELD_CONTROL_CLASS : undefined;
  const fieldWrapClass = embedInDrawer ? DRAWER_FORM_FIELD_CLASS : "space-y-2";
  const rootClass = embedInDrawer ? DRAWER_FORM_STACK_CLASS : "space-y-4";

  if (pendingStripe && publishableKey) {
    const stripeAmount = tenders.find((t) => t.method === "STRIPE")?.amount ?? 0;
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Complete card payment for {formatMoney(stripeAmount)}
        </p>
        <EmbeddedStripePayment
          publishableKey={publishableKey}
          clientSecret={pendingStripe.clientSecret}
          stripeAccountId={stripeAccountId}
          onSuccess={() => {
            void (async () => {
              try {
                if (awaitSettlement) {
                  await awaitSettlement();
                }
                toast.success(successMessage);
                onComplete();
              } catch (err) {
                toast.error(
                  err instanceof Error
                    ? err.message
                    : "Payment is still processing",
                );
              }
            })();
          }}
          onError={(message) => toast.error(message)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setPendingStripe(null)}
        >
          Back
        </Button>
      </div>
    );
  }

  const savedCardSlot =
    primaryMethod === "STRIPE" && stripeReady ? (
      <div className="space-y-2">
        {savedCards.length > 0 ? (
          <>
            <Label
              className={
                embedInDrawer
                  ? SALES_DRAWER_VIEW_FIELD_LABEL_CLASS
                  : fieldLabelClass
              }
            >
              Saved card
            </Label>
            <SearchableSelect
              inDialog
              items={savedCardItems}
              value={savedCardId ?? "new"}
              onValueChange={(v) => setSavedCardId(v === "new" ? null : v)}
              placeholder="Card"
              triggerClassName={
                embedInDrawer ? SALES_DRAWER_FIELD_CLASS : fieldControlClass
              }
            />
          </>
        ) : null}
        <p className="text-[12px] font-medium text-[#8A8A8A]">
          {(!savedCardId || savedCardId === "new") && savedCards.length > 0
            ? "Or enter a new card on the next step."
            : "Card details are collected on the next step via Stripe."}
        </p>
      </div>
    ) : null;

  if (embedInDrawer) {
    return (
      <SalesPaymentDrawerForm
        balanceDue={balanceDue}
        subtotal={subtotal}
        primaryMethod={primaryMethod}
        onPrimaryMethodChange={(method) => {
          setPrimaryMethod(method);
          if (method !== "GIFT_CARD") {
            setPrimaryGiftCardId(null);
            setPrimaryGiftCard(null);
          }
        }}
        primaryAmount={primaryAmount}
        onPrimaryAmountChange={setPrimaryAmount}
        splitEnabled={splitEnabled}
        onSplitEnabledChange={setSplitEnabled}
        secondaryMethod={secondaryMethod}
        onSecondaryMethodChange={(method) => {
          setSecondaryMethod(method);
          if (method !== "GIFT_CARD") {
            setSecondaryGiftCardId(null);
            setSecondaryGiftCard(null);
          }
        }}
        secondaryAmount={secondaryAmount}
        onSecondaryAmountChange={setSecondaryAmount}
        methodItems={methodItems}
        stripeReady={stripeReady}
        contactGiftCardCount={contactGiftCardCount}
        walletBalance={walletBalance}
        contactId={contactId}
        primaryGiftCardId={primaryGiftCardId}
        onPrimaryGiftCardSelect={(id, card) => {
          setPrimaryGiftCardId(id);
          setPrimaryGiftCard(card);
          if (card) {
            const bal = parseFloat(card.currentBalance);
            setPrimaryAmount(Math.min(balanceDue, bal));
          }
        }}
        secondaryGiftCardId={secondaryGiftCardId}
        onSecondaryGiftCardSelect={(id, card) => {
          setSecondaryGiftCardId(id);
          setSecondaryGiftCard(card);
          if (card) {
            const remainder = Math.max(
              0,
              Math.round((balanceDue - primaryAmount) * 100) / 100,
            );
            const bal = parseFloat(card.currentBalance);
            setSecondaryAmount(Math.min(remainder, bal));
          }
        }}
        savedCardSlot={savedCardSlot}
        tenderTotal={tenderTotal}
        hideSubmitButton={hideSubmitButton}
        submitLabel={submitLabel}
        submitDisabled={submitDisabled}
        onSubmit={() => void handleCollect()}
      />
    );
  }

  return (
    <div className={rootClass}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={fieldWrapClass}>
          <Label className={fieldLabelClass}>Payment method</Label>
          <SearchableSelect
            inDialog
            items={methodItems.map((item) =>
              item.value === "GIFT_CARD" && contactGiftCardCount > 0
                ? {
                    ...item,
                    label: `${item.label} (${contactGiftCardCount})`,
                  }
                : item,
            )}
            value={primaryMethod}
            onValueChange={(v) => {
              setPrimaryMethod(v as PaymentMethod);
              if (v !== "GIFT_CARD") {
                setPrimaryGiftCardId(null);
                setPrimaryGiftCard(null);
              }
            }}
            placeholder="Method"
            triggerClassName={fieldControlClass}
          />
        </div>
        <div className={fieldWrapClass}>
          <Label className={fieldLabelClass}>Amount</Label>
          <Input
            type="number"
            step="0.01"
            min={0.01}
            max={balanceDue}
            value={primaryAmount || ""}
            onChange={(e) =>
              setPrimaryAmount(parseFloat(e.target.value) || 0)
            }
            className={fieldControlClass}
          />
        </div>
      </div>

      {savedCardSlot}

      {primaryMethod === "WALLET" && walletBalance != null ? (
        <p className="text-xs text-muted-foreground">
          Wallet balance: {formatMoney(walletBalance)}
        </p>
      ) : null}

      {primaryMethod === "GIFT_CARD" ? (
        <GiftCardPaymentPicker
          contactId={contactId}
          balanceDue={balanceDue}
          selectedCardId={primaryGiftCardId}
          onSelectCard={(id, card: GiftCardListItem | null) => {
            setPrimaryGiftCardId(id);
            setPrimaryGiftCard(card);
            if (card) {
              const bal = parseFloat(card.currentBalance);
              setPrimaryAmount(Math.min(balanceDue, bal));
            }
          }}
          amount={primaryAmount}
          onAmountChange={setPrimaryAmount}
        />
      ) : null}

      <div className="flex items-center gap-2">
        <Checkbox
          id="split-payment"
          checked={splitEnabled}
          onCheckedChange={(checked) => {
            setSplitEnabled(checked === true);
            if (checked === true && secondaryAmount <= 0) {
              const remainder = Math.max(
                0,
                Math.round((balanceDue - primaryAmount) * 100) / 100,
              );
              setSecondaryAmount(remainder);
            }
          }}
        />
        <Label htmlFor="split-payment" className="font-normal">
          Split payment (e.g. wallet + card)
        </Label>
      </div>

      {splitEnabled ? (
        <div className="grid gap-4 rounded-md border p-3 sm:grid-cols-2">
          <div className={fieldWrapClass}>
            <Label className={fieldLabelClass}>Second method</Label>
            <SearchableSelect
              inDialog
              items={methodItems.filter((m) => m.value !== primaryMethod)}
              value={secondaryMethod}
              onValueChange={(v) => {
                setSecondaryMethod(v as PaymentMethod);
                if (v !== "GIFT_CARD") {
                  setSecondaryGiftCardId(null);
                  setSecondaryGiftCard(null);
                }
              }}
              placeholder="Method"
              triggerClassName={fieldControlClass}
            />
          </div>
          <div className={fieldWrapClass}>
            <Label className={fieldLabelClass}>Second amount</Label>
            <Input
              type="number"
              step="0.01"
              min={0.01}
              value={secondaryAmount || ""}
              onChange={(e) =>
                setSecondaryAmount(parseFloat(e.target.value) || 0)
              }
              className={fieldControlClass}
            />
          </div>
          {secondaryMethod === "WALLET" && walletBalance != null ? (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Wallet balance: {formatMoney(walletBalance)}
            </p>
          ) : null}
          {secondaryMethod === "GIFT_CARD" ? (
            <div className="sm:col-span-2">
              <GiftCardPaymentPicker
                contactId={contactId}
                balanceDue={Math.max(
                  0,
                  Math.round((balanceDue - primaryAmount) * 100) / 100,
                )}
                selectedCardId={secondaryGiftCardId}
                onSelectCard={(id, card) => {
                  setSecondaryGiftCardId(id);
                  setSecondaryGiftCard(card);
                  if (card) {
                    const remainder = Math.max(
                      0,
                      Math.round((balanceDue - primaryAmount) * 100) / 100,
                    );
                    const bal = parseFloat(card.currentBalance);
                    setSecondaryAmount(Math.min(remainder, bal));
                  }
                }}
                amount={secondaryAmount}
                onAmountChange={setSecondaryAmount}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          Collecting {formatMoney(tenderTotal)} of {formatMoney(balanceDue)}
        </span>
        {hasStripeTender && !stripeReady ? (
          <span className="text-destructive">Connect Stripe to accept cards</span>
        ) : null}
      </div>

      {!hideSubmitButton ? (
        <Button
          type="button"
          className="w-full"
          disabled={submitDisabled}
          onClick={() => void handleCollect()}
        >
          {submitLabel}
        </Button>
      ) : null}
    </div>
  );
}
