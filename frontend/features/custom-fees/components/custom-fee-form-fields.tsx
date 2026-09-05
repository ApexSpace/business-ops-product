"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { AmountUnitToggle } from "@/components/ui/amount-unit-toggle";
import { PAYMENT_METHOD_OPTIONS } from "@/features/payments/schemas/payment-profile";
import type { CustomFeeFormValues } from "@/features/custom-fees/schemas/custom-fee-profile";
import { SETTINGS_FORM_DESCRIPTION_CLASS } from "@/lib/design/settings-form-tokens";
import { cn } from "@/lib/utils";

interface CustomFeeFormFieldsProps {
  values: CustomFeeFormValues;
  onChange: (next: CustomFeeFormValues) => void;
  disabled?: boolean;
  showEnabledToggle?: boolean;
}

export function CustomFeeFormFields({
  values,
  onChange,
  disabled = false,
  showEnabledToggle = false,
}: CustomFeeFormFieldsProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className={SETTINGS_FORM_DESCRIPTION_CLASS}>
          Enter a name for the custom fee. This name is shown to clients during
          booking, at checkout, and on receipts.
        </p>
        <Label htmlFor="custom-fee-name">Name</Label>
        <Input
          id="custom-fee-name"
          value={values.name}
          disabled={disabled}
          placeholder="Enter a name for custom fee"
          onChange={(e) => onChange({ ...values, name: e.target.value })}
        />
      </div>

      <div className="space-y-3">
        <Label>What does this fee apply to?</Label>
        <RadioGroup
          value={values.applicationScope}
          disabled={disabled}
          onValueChange={(scope) =>
            onChange({
              ...values,
              applicationScope: scope as CustomFeeFormValues["applicationScope"],
              paymentMethods:
                scope === "PAYMENT_METHOD" ? values.paymentMethods : [],
            })
          }
          className="space-y-3"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="ENTIRE_SALE" id="custom-fee-entire-sale" />
              <Label htmlFor="custom-fee-entire-sale" className="font-normal">
                The entire sale
              </Label>
            </div>
            <p className={cn(SETTINGS_FORM_DESCRIPTION_CLASS, "pl-6")}>
              Fee applies to the sale subtotal regardless of payment method
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <RadioGroupItem
                value="PAYMENT_METHOD"
                id="custom-fee-payment-methods"
              />
              <Label htmlFor="custom-fee-payment-methods" className="font-normal">
                Only specific payment methods
              </Label>
            </div>
            <p className={cn(SETTINGS_FORM_DESCRIPTION_CLASS, "pl-6")}>
              Fee applies to the payment amount when specific payment methods are
              used
            </p>
          </div>
        </RadioGroup>
      </div>

      {values.applicationScope === "PAYMENT_METHOD" ? (
        <div className="space-y-2 rounded-lg border border-border/70 p-4">
          <Label>Payment methods</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {PAYMENT_METHOD_OPTIONS.map((option) => {
              const checked = values.paymentMethods.includes(option.value);
              return (
                <label
                  key={option.value}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(next) => {
                      const paymentMethods = next
                        ? [...values.paymentMethods, option.value]
                        : values.paymentMethods.filter(
                            (method) => method !== option.value,
                          );
                      onChange({ ...values, paymentMethods });
                    }}
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="space-y-3 rounded-lg border border-border/70 p-4">
        <Label>Fee amount</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={values.amountType === "PERCENTAGE" ? 1 : 0.01}
            max={values.amountType === "PERCENTAGE" ? 100 : undefined}
            step={values.amountType === "PERCENTAGE" ? 1 : 0.01}
            value={values.amount}
            disabled={disabled}
            placeholder={values.amountType === "PERCENTAGE" ? "10" : "5.00"}
            onChange={(e) => onChange({ ...values, amount: e.target.value })}
            className="flex-1"
          />
          <AmountUnitToggle
            value={values.amountType}
            currencyValue="FIXED"
            percentValue="PERCENTAGE"
            disabled={disabled}
            onValueChange={(amountType) => onChange({ ...values, amountType })}
            aria-label="Fee amount unit"
          />
        </div>
      </div>

      {showEnabledToggle ? (
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="custom-fee-enabled">Enabled</Label>
          <Switch
            id="custom-fee-enabled"
            checked={values.isEnabled}
            disabled={disabled}
            onCheckedChange={(checked) =>
              onChange({ ...values, isEnabled: checked })
            }
          />
        </div>
      ) : null}
    </div>
  );
}
