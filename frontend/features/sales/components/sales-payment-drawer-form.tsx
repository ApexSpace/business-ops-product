"use client";

import { DRAWER_PRIMARY_BUTTON_CLASS } from "@/lib/design/drawer-tokens";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CreditCard,
  FileCheck,
  Gift,
  Monitor,
  Pencil,
  User,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/forms/searchable-select";
import type { CheckoutAdvancedSettings } from "@/features/checkout-advanced-settings/api/checkout-advanced-settings.api";
import { DEFAULT_TIP_PERCENTS } from "@/features/checkout-advanced-settings/schemas/checkout-advanced-settings-profile";
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
import { merchandiseSubtotalFromCheckout } from "@/features/sales/utils/checkout-custom-fees";
import { cn } from "@/lib/utils";

type PaymentUiKey = string;

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
    stripeOnly: true,
  },
  {
    key: "credit_card",
    label: "Credit card",
    method: "STRIPE",
    icon: CreditCard,
    stripeOnly: true,
  },
  { key: "cash", label: "Cash", method: "CASH", icon: Banknote },
  { key: "gift_card", label: "Gift card", method: "GIFT_CARD", icon: Gift },
  { key: "wallet", label: "Account balance", method: "WALLET", icon: Wallet },
  { key: "check", label: "Check", method: "CHECK", icon: FileCheck },
];

function defaultUiKeyForMethod(method: PaymentMethod): PaymentUiKey {
  if (method === "STRIPE" || method === "CARD") return "credit_card";
  if (method === "GIFT_CARD") return "gift_card";
  if (method === "WALLET") return "wallet";
  if (method === "CHECK") return "check";
  if (method === "OTHER" || method === "BANK_TRANSFER") return "other";
  return "cash";
}

function customUiKey(label: string): PaymentUiKey {
  return `custom:${label.toLowerCase()}`;
}

export interface SalesPaymentDrawerFormProps {
  balanceDue: number;
  chargeTotal: number;
  subtotal?: number;
  customFeeLines?: Array<{ id: string; name: string; amount: number }>;
  advancedSettings?: CheckoutAdvancedSettings | null;
  hasProductLines?: boolean;
  onTipAmountChange: (amount: number) => void;
  onPaymentReferenceChange: (reference: string | null) => void;
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
  chargeTotal,
  subtotal,
  customFeeLines = [],
  advancedSettings,
  hasProductLines = false,
  onTipAmountChange,
  onPaymentReferenceChange,
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
  const baseSubtotal =
    customFeeLines.length > 0 && subtotal != null
      ? merchandiseSubtotalFromCheckout(subtotal, customFeeLines)
      : (subtotal ?? balanceDue);

  const tipPercents =
    advancedSettings?.tipButtonPercents?.length &&
    advancedSettings.tipButtonPercents.length > 0
      ? advancedSettings.tipButtonPercents
      : DEFAULT_TIP_PERCENTS;

  const showTipSection = useMemo(() => {
    if (advancedSettings?.hideTipButtons) return false;
    if (advancedSettings && !advancedSettings.askClientsForTip) return false;
    if (advancedSettings?.askForTipProductsOnly && !hasProductLines) {
      return false;
    }
    return true;
  }, [advancedSettings, hasProductLines]);

  const defaultPercent =
    tipPercents[Math.min(1, tipPercents.length - 1)] ?? tipPercents[0] ?? 20;

  const [tipPreset, setTipPreset] = useState<string | null>(
    showTipSection ? String(defaultPercent) : null,
  );
  const [customTip, setCustomTip] = useState("");
  const [showOtherMethods, setShowOtherMethods] = useState(false);
  const [cashTendered, setCashTendered] = useState("");
  const [uiKey, setUiKey] = useState<PaymentUiKey>(() =>
    defaultUiKeyForMethod(primaryMethod),
  );

  const tipAmount = useMemo(() => {
    if (!showTipSection || !tipPreset) return 0;
    if (tipPreset === "custom") {
      const parsed = parseFloat(customTip);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }
    const percent = parseFloat(tipPreset);
    if (!Number.isFinite(percent)) return 0;
    return Math.round(baseSubtotal * (percent / 100) * 100) / 100;
  }, [baseSubtotal, customTip, showTipSection, tipPreset]);

  useEffect(() => {
    onTipAmountChange(tipAmount);
  }, [onTipAmountChange, tipAmount]);

  const displayTotal = Math.round((balanceDue + tipAmount) * 100) / 100;

  const customPaymentTiles = advancedSettings?.customPaymentMethodNames ?? [];
  const showCheckTile = advancedSettings?.enableCheckPayments ?? false;
  const showChangeCalculator =
    (advancedSettings?.showChangeCalculator ?? false) &&
    primaryMethod === "CASH" &&
    !splitEnabled;

  const cashTenderedAmount = parseFloat(cashTendered);
  const changeDue =
    showChangeCalculator &&
    Number.isFinite(cashTenderedAmount) &&
    cashTenderedAmount >= chargeTotal
      ? Math.round((cashTenderedAmount - chargeTotal) * 100) / 100
      : null;

  const visibleOptions = PAYMENT_UI_OPTIONS.filter((option) => {
    if (option.key === "check") return showCheckTile;
    if (option.stripeOnly) return stripeReady || option.key === "credit_card";
    if (option.method === "STRIPE" && !stripeReady) {
      return option.key === "credit_card";
    }
    return (
      methodItems.some((item) => item.value === option.method) ||
      (option.method === "STRIPE" &&
        methodItems.some((item) => item.value === "CARD"))
    );
  }).map((option) => {
    if (option.method === "STRIPE" && !stripeReady) {
      return { ...option, method: "CARD" as PaymentMethod };
    }
    return option;
  });

  const selectUiMethod = (
    key: PaymentUiKey,
    method: PaymentMethod,
    reference?: string | null,
  ) => {
    setUiKey(key);
    setShowOtherMethods(key === "other");
    onPrimaryMethodChange(method);
    onPaymentReferenceChange(reference ?? null);
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-5">
      <div className={SALES_PAYMENT_SUMMARY_CARD_CLASS}>
        <div className={SALES_PAYMENT_SUMMARY_BODY_CLASS}>
          <div className="flex items-center justify-between gap-3 text-[14px] font-medium text-violet-primary-darker">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatMoney(baseSubtotal)}</span>
          </div>

          {customFeeLines.map((fee) => (
            <div
              key={fee.id}
              className="flex items-center justify-between gap-3 text-[14px] font-medium text-violet-primary-darker"
            >
              <span>{fee.name}</span>
              <span className="tabular-nums">{formatMoney(fee.amount)}</span>
            </div>
          ))}

          {showTipSection ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-[14px] font-medium text-violet-primary-darker">
                <span>Tip</span>
                <span className="tabular-nums">{formatMoney(tipAmount)}</span>
              </div>
              <div className={SALES_PAYMENT_TIP_GRID_CLASS}>
                {tipPercents.map((percent) => (
                  <button
                    key={percent}
                    type="button"
                    className={cn(
                      SALES_PAYMENT_TIP_CHIP_CLASS,
                      tipPreset === String(percent) &&
                        SALES_PAYMENT_TIP_CHIP_ACTIVE_CLASS,
                    )}
                    onClick={() =>
                      setTipPreset((current) =>
                        current === String(percent) ? null : String(percent),
                      )
                    }
                  >
                    {percent}%
                  </button>
                ))}
                <button
                  type="button"
                  className={cn(
                    SALES_PAYMENT_TIP_CHIP_CLASS,
                    tipPreset === "custom" && SALES_PAYMENT_TIP_CHIP_ACTIVE_CLASS,
                  )}
                  onClick={() =>
                    setTipPreset((current) =>
                      current === "custom" ? null : "custom",
                    )
                  }
                >
                  Custom
                </button>
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
          ) : null}
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
          onClick={() => onPrimaryAmountChange(chargeTotal)}
        >
          Reset to total ({formatMoney(chargeTotal)})
        </button>
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
                  active ? "text-violet-primary-darker" : "text-[#6B6B6B]",
                )}
                onClick={() => selectUiMethod(option.key, option.method)}
              >
                <Icon
                  className={cn(
                    "size-5",
                    active ? "text-violet-primary-normal" : "text-[#8A8A8A]",
                  )}
                  aria-hidden
                />
                <span className="text-[12px] font-semibold leading-tight">
                  {label}
                </span>
              </button>
            );
          })}
          {customPaymentTiles.map((label) => {
            const key = customUiKey(label);
            const active = uiKey === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                className={cn(
                  SALES_PAYMENT_METHOD_CARD_CLASS,
                  active && SALES_PAYMENT_METHOD_CARD_ACTIVE_CLASS,
                  active ? "text-violet-primary-darker" : "text-[#6B6B6B]",
                )}
                onClick={() => selectUiMethod(key, "OTHER", label)}
              >
                <Banknote
                  className={cn(
                    "size-5",
                    active ? "text-violet-primary-normal" : "text-[#8A8A8A]",
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
            selectUiMethod("other", "OTHER", null);
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
            onValueChange={(value) => {
              onPrimaryMethodChange(value as PaymentMethod);
              onPaymentReferenceChange(null);
            }}
            placeholder="Select method"
            triggerClassName={SALES_DRAWER_FIELD_CLASS}
          />
        ) : null}
      </div>

      {showChangeCalculator ? (
        <div className="space-y-2 rounded-[12px] border border-[#E8E4DC] bg-violet-primary-surface/40 p-4">
          <Label className={SALES_DRAWER_VIEW_FIELD_LABEL_CLASS}>
            Cash tendered
          </Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={cashTendered}
            onChange={(event) => setCashTendered(event.target.value)}
            className={SALES_DRAWER_FIELD_CLASS}
            placeholder="0.00"
          />
          {changeDue != null ? (
            <p className="text-[13px] font-semibold text-violet-primary-darker">
              Change due: {formatMoney(changeDue)}
            </p>
          ) : null}
        </div>
      ) : null}

      {savedCardSlot}

      {primaryMethod === "WALLET" && walletBalance != null ? (
        <p className="text-[12px] font-medium text-[#8A8A8A]">
          Wallet balance: {formatMoney(walletBalance)}
        </p>
      ) : null}

      {primaryMethod === "GIFT_CARD" ? (
        <GiftCardPaymentPicker
          contactId={contactId}
          balanceDue={chargeTotal}
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
                Math.round((chargeTotal - primaryAmount) * 100) / 100,
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
                Math.round((chargeTotal - primaryAmount) * 100) / 100,
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
        Collecting {formatMoney(tenderTotal)} of {formatMoney(chargeTotal)}
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
