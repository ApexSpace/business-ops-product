"use client";

import { DRAWER_PRIMARY_BUTTON_CLASS } from "@/lib/design/drawer-tokens";

import { useMemo, useState } from "react";
import { Banknote,
  CreditCard,
  Gift,
  Monitor,
  Pencil, User,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/forms/searchable-select";
import type { PaymentMethod } from "@/features/payments/api/payment-collection.api";
import { formatMoney } from "@/features/payments/schemas/payment-profile";
import { GiftCardPaymentPicker } from "@/features/gift-cards/components/gift-card-payment-picker";
import type { GiftCardListItem } from "@/features/gift-cards/types";
import {
  SALES_PAYMENT_METHOD_CARD_ACTIVE_CLASS,
  SALES_PAYMENT_METHOD_CARD_CLASS,
  SALES_PAYMENT_METHOD_GRID_CLASS,
  SALES_PAYMENT_OTHER_METHOD_CLASS,
  SALES_PAYMENT_RESET_LINK_CLASS,
  SALES_PAYMENT_SECTION_LABEL_CLASS,
  SALES_PAYMENT_SUMMARY_BODY_CLASS,
  SALES_PAYMENT_SUMMARY_CARD_CLASS,
  SALES_PAYMENT_SUMMARY_TOTAL_BAR_CLASS,
  SALES_PAYMENT_TIP_CHIP_ACTIVE_CLASS,
  SALES_PAYMENT_TIP_CHIP_CLASS,
  SALES_PAYMENT_TIP_GRID_CLASS,
  SALES_DRAWER_FIELD_CLASS,
  SALES_DRAWER_VIEW_FIELD_LABEL_CLASS,
} from "@/features/sales/styles/sales-drawer-tokens";
import { cn } from "@/lib/utils";

type TipPreset = "18" | "20" | "22" | "custom";

type PaymentUiKey =
  | "front_desk"
  | "self_checkout"
  | "credit_card"
  | "cash"
  | "gift_card"
  | "wallet"
  | "other";

const TIP_PRESETS: TipPreset[] = ["18", "20", "22", "custom"];

const PAYMENT_UI_OPTIONS: Array<{
  key: PaymentUiKey;
  label: string;
  method: PaymentMethod;
  icon: typeof User;
  stripeOnly?: boolean;
}> = [
  { key: "front_desk", label: "Front desk", method: "CASH", icon: User },
  {
    key: "self_checkout",
    label: "Self checkout",
    method: "STRIPE",
    icon: Monitor,
    stripeOnly: true },
  {
    key: "credit_card",
    label: "Credit card",
    method: "STRIPE",
    icon: CreditCard,
    stripeOnly: true },
  { key: "cash", label: "Cash", method: "CASH", icon: Banknote },
  { key: "gift_card", label: "Gift card", method: "GIFT_CARD", icon: Gift },
  { key: "wallet", label: "Account balance", method: "WALLET", icon: Wallet },
];

function defaultUiKeyForMethod(method: PaymentMethod): PaymentUiKey {
  if (method === "STRIPE" || method === "CARD") return "credit_card";
  if (method === "GIFT_CARD") return "gift_card";
  if (method === "WALLET") return "wallet";
  if (method === "OTHER" || method === "BANK_TRANSFER") return "other";
  return "cash";
}

export interface SalesPaymentDrawerFormProps {
  balanceDue: number;
  subtotal?: number;
  primaryMethod: PaymentMethod;
  onPrimaryMethodChange: (method: PaymentMethod) => void;
  primaryAmount: number;
  onPrimaryAmountChange: (amount: number) => void;
  splitEnabled: boolean;
  onSplitEnabledChange: (enabled: boolean) => void;
  secondaryMethod: PaymentMethod;
  onSecondaryMethodChange: (method: PaymentMethod) => void;
  secondaryAmount: number;
  onSecondaryAmountChange: (amount: number) => void;
  methodItems: Array<{ value: string; label: string }>;
  stripeReady: boolean;
  contactGiftCardCount: number;
  walletBalance: number | null;
  contactId: string;
  primaryGiftCardId: string | null;
  onPrimaryGiftCardSelect: (
    id: string | null,
    card: GiftCardListItem | null,
  ) => void;
  secondaryGiftCardId: string | null;
  onSecondaryGiftCardSelect: (
    id: string | null,
    card: GiftCardListItem | null,
  ) => void;
  savedCardSlot?: React.ReactNode;
  tenderTotal: number;
  hideSubmitButton?: boolean;
  submitLabel: string;
  submitDisabled: boolean;
  onSubmit: () => void;
}

export function SalesPaymentDrawerForm({
  balanceDue,
  subtotal,
  primaryMethod,
  onPrimaryMethodChange,
  primaryAmount,
  onPrimaryAmountChange,
  splitEnabled,
  onSplitEnabledChange,
  secondaryMethod,
  onSecondaryMethodChange,
  secondaryAmount,
  onSecondaryAmountChange,
  methodItems,
  stripeReady,
  contactGiftCardCount,
  walletBalance,
  contactId,
  primaryGiftCardId,
  onPrimaryGiftCardSelect,
  secondaryGiftCardId,
  onSecondaryGiftCardSelect,
  savedCardSlot,
  tenderTotal,
  hideSubmitButton,
  submitLabel,
  submitDisabled,
  onSubmit,
}: SalesPaymentDrawerFormProps) {
  const baseSubtotal = subtotal ?? balanceDue;
  const [tipPreset, setTipPreset] = useState<TipPreset | null>("20");
  const [customTip, setCustomTip] = useState("");
  const [showOtherMethods, setShowOtherMethods] = useState(false);
  // UI tiles can share the same PaymentMethod (e.g. Self checkout + Credit card → STRIPE).
  // Keep tile selection independent; never remap method → uiKey after click.
  const [uiKey, setUiKey] = useState<PaymentUiKey>(() =>
    defaultUiKeyForMethod(primaryMethod),
  );

  const tipAmount = useMemo(() => {
    if (!tipPreset) return 0;
    if (tipPreset === "custom") {
      const parsed = parseFloat(customTip);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }
    return Math.round(baseSubtotal * (parseFloat(tipPreset) / 100) * 100) / 100;
  }, [baseSubtotal, customTip, tipPreset]);

  const displayTotal = Math.round((balanceDue + tipAmount) * 100) / 100;

  const visibleOptions = PAYMENT_UI_OPTIONS.filter((option) => {
    if (option.stripeOnly) return stripeReady || option.key === "credit_card";
    if (option.method === "STRIPE" && !stripeReady) {
      return option.key === "credit_card";
    }
    return methodItems.some((item) => item.value === option.method) ||
      (option.method === "STRIPE" &&
        methodItems.some((item) => item.value === "CARD"));
  }).map((option) => {
    if (option.method === "STRIPE" && !stripeReady) {
      return { ...option, method: "CARD" as PaymentMethod,
};
    }
    return option;
  });

  const selectUiMethod = (key: PaymentUiKey, method: PaymentMethod) => {
    setUiKey(key);
    setShowOtherMethods(key === "other");
    onPrimaryMethodChange(method);
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-5">
      <div className={SALES_PAYMENT_SUMMARY_CARD_CLASS}>
        <div className={SALES_PAYMENT_SUMMARY_BODY_CLASS}>
          <div className="flex items-center justify-between gap-3 text-[14px] font-medium text-violet-primary-darker">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatMoney(baseSubtotal)}</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-[14px] font-medium text-violet-primary-darker">
              <span>Tip</span>
              <span className="tabular-nums">{formatMoney(tipAmount)}</span>
            </div>
            <div className={SALES_PAYMENT_TIP_GRID_CLASS}>
              {TIP_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={cn(
                    SALES_PAYMENT_TIP_CHIP_CLASS,
                    tipPreset === preset && SALES_PAYMENT_TIP_CHIP_ACTIVE_CLASS,
                  )}
                  onClick={() =>
                    setTipPreset((current) =>
                      current === preset ? null : preset,
                    )
                  }
                >
                  {preset === "custom" ? "Custom" : `${preset}%`}
                </button>
              ))}
            </div>
            {tipPreset === "custom" ? (
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Custom tip amount"
                value={customTip}
                onChange={(event) => setCustomTip(event.target.value)}
                className={SALES_DRAWER_FIELD_CLASS}
              />
            ) : null}
          </div>
        </div>
        <div className={SALES_PAYMENT_SUMMARY_TOTAL_BAR_CLASS}>
          <span>Total</span>
          <span className="tabular-nums text-violet-primary-normal">
            {formatMoney(displayTotal)}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label className={SALES_DRAWER_VIEW_FIELD_LABEL_CLASS}>
          Amount to Charge
        </Label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[14px] font-semibold text-[#8A8A8A]">
            $
          </span>
          <Input
            type="number"
            step="0.01"
            min={0.01}
            max={balanceDue}
            value={primaryAmount || ""}
            onChange={(event) =>
              onPrimaryAmountChange(parseFloat(event.target.value) || 0)
            }
            className={cn(SALES_DRAWER_FIELD_CLASS, "pl-7 pr-10")}
          />
          <Pencil
            className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-violet-primary-normal"
            aria-hidden
          />
        </div>
        <button
          type="button"
          className={SALES_PAYMENT_RESET_LINK_CLASS}
          onClick={() => onPrimaryAmountChange(balanceDue)}
        >
          Reset to total ({formatMoney(balanceDue)})
        </button>
        {tipAmount > 0 ? (
          <p className="text-[12px] font-medium text-[#8A8A8A]">
            Tip shown above is for reference — sale balance due is{" "}
            {formatMoney(balanceDue)}.
          </p>
        ) : null}
      </div>

      <div className="space-y-2.5">
        <p className={SALES_PAYMENT_SECTION_LABEL_CLASS}>
          Choose payment method
        </p>
        <div className={SALES_PAYMENT_METHOD_GRID_CLASS}>
          {visibleOptions.map((option) => {
            const Icon = option.icon;
            const active = uiKey === option.key;
            const label =
              option.key === "gift_card" && contactGiftCardCount > 0
                ? `${option.label} (${contactGiftCardCount})`
                : option.label;
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={active}
                className={cn(
                  SALES_PAYMENT_METHOD_CARD_CLASS,
                  active && SALES_PAYMENT_METHOD_CARD_ACTIVE_CLASS,
                  active
                    ? "text-violet-primary-darker"
                    : "text-[#6B6B6B]",
                )}
                onClick={() => selectUiMethod(option.key, option.method)}
              >
                <Icon
                  className={cn(
                    "size-5",
                    active
                      ? "text-violet-primary-normal"
                      : "text-[#8A8A8A]",
                  )}
                  aria-hidden
                />
                <span className="text-[12px] font-semibold leading-tight">
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className={cn(
            SALES_PAYMENT_OTHER_METHOD_CLASS,
            (uiKey === "other" || showOtherMethods) &&
              "border-violet-primary-normal text-violet-primary-darker",
          )}
          onClick={() => {
            setShowOtherMethods(true);
            setUiKey("other");
            onPrimaryMethodChange("OTHER");
          }}
        >
          Other payment method
        </button>

        {showOtherMethods || uiKey === "other" ? (
          <SearchableSelect
            items={methodItems.filter(
              (item) =>
                item.value === "OTHER" ||
                item.value === "BANK_TRANSFER" ||
                item.value === "CARD",
            )}
            value={primaryMethod}
            onValueChange={(value) =>
              onPrimaryMethodChange(value as PaymentMethod)
            }
            placeholder="Select method"
            triggerClassName={SALES_DRAWER_FIELD_CLASS}
          />
        ) : null}
      </div>

      {savedCardSlot}

      {primaryMethod === "WALLET" && walletBalance != null ? (
        <p className="text-[12px] font-medium text-[#8A8A8A]">
          Wallet balance: {formatMoney(walletBalance)}
        </p>
      ) : null}

      {primaryMethod === "GIFT_CARD" ? (
        <GiftCardPaymentPicker
          contactId={contactId}
          balanceDue={balanceDue}
          selectedCardId={primaryGiftCardId}
          onSelectCard={onPrimaryGiftCardSelect}
          amount={primaryAmount}
          onAmountChange={onPrimaryAmountChange}
        />
      ) : null}

      <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[10px] border border-[#E8E4DC] bg-white px-3">
        <Checkbox
          id="sales-split-payment"
          checked={splitEnabled}
          onCheckedChange={(checked) => {
            onSplitEnabledChange(checked === true);
            if (checked === true && secondaryAmount <= 0) {
              const remainder = Math.max(
                0,
                Math.round((balanceDue - primaryAmount) * 100) / 100,
              );
              onSecondaryAmountChange(remainder);
            }
          }}
          className="size-5 rounded-[4px] border-violet-primary-normal data-[checked]:border-violet-primary-normal data-[checked]:bg-violet-primary-normal"
        />
        <span className="text-[13px] font-medium text-[#524346]">
          Split payment (e.g. wallet + card)
        </span>
      </label>

      {splitEnabled ? (
        <div className="space-y-4 rounded-[12px] border border-[#E8E4DC] bg-violet-primary-surface/50 p-4">
          <p className="text-[13px] font-semibold text-violet-primary-darker">
            Split details
          </p>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className={SALES_DRAWER_VIEW_FIELD_LABEL_CLASS}>
                Second method
              </Label>
              <SearchableSelect
                items={methodItems.filter((m) => m.value !== primaryMethod)}
                value={secondaryMethod}
                onValueChange={(value) =>
                  onSecondaryMethodChange(value as PaymentMethod)
                }
                placeholder="Select method"
                triggerClassName={SALES_DRAWER_FIELD_CLASS}
              />
            </div>
            <div className="space-y-2">
              <Label className={SALES_DRAWER_VIEW_FIELD_LABEL_CLASS}>
                Second amount
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[14px] font-semibold text-[#8A8A8A]">
                  $
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min={0.01}
                  value={secondaryAmount || ""}
                  onChange={(event) =>
                    onSecondaryAmountChange(parseFloat(event.target.value) || 0)
                  }
                  className={cn(SALES_DRAWER_FIELD_CLASS, "pl-7")}
                />
              </div>
            </div>
          </div>
          {secondaryMethod === "WALLET" && walletBalance != null ? (
            <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[#E8E4DC] bg-white px-3 py-2.5 text-[13px] font-medium">
              <span className="text-[#8A8A8A]">Wallet balance</span>
              <span className="tabular-nums text-violet-primary-darker">
                {formatMoney(walletBalance)}
              </span>
            </div>
          ) : null}
          {secondaryMethod === "GIFT_CARD" ? (
            <GiftCardPaymentPicker
              contactId={contactId}
              balanceDue={Math.max(
                0,
                Math.round((balanceDue - primaryAmount) * 100) / 100,
              )}
              selectedCardId={secondaryGiftCardId}
              onSelectCard={onSecondaryGiftCardSelect}
              amount={secondaryAmount}
              onAmountChange={onSecondaryAmountChange}
            />
          ) : null}
        </div>
      ) : null}

      <p className="text-[13px] font-medium text-[#8A8A8A]">
        Collecting {formatMoney(tenderTotal)} of {formatMoney(balanceDue)}
      </p>

      {!hideSubmitButton ? (
        <Button
          type="button"
          variant="brand"
          className={DRAWER_PRIMARY_BUTTON_CLASS}
          disabled={submitDisabled}
          onClick={onSubmit}
        >
          {submitLabel}
        </Button>
      ) : null}
    </div>
  );
}
