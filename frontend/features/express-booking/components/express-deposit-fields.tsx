"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { AmountUnitToggle } from "@/components/ui/amount-unit-toggle";
import { cn } from "@/lib/utils";

export type ExpressDepositFieldsValue = {
  expressRequireCard: boolean;
  expressRequireDeposit: boolean;
  paymentMode: "full" | "partial";
  partialType: "FIXED" | "PERCENTAGE";
  expressDepositAmount: string;
};

export function expressDepositFieldsFromSettings(settings: {
  expressRequireCard: boolean;
  expressRequireDeposit: boolean;
  expressDepositType: string;
  expressDepositAmount: string | null;
}): ExpressDepositFieldsValue {
  const isPartial =
    settings.expressRequireDeposit &&
    settings.expressDepositType !== "FULL";

  return {
    expressRequireCard: settings.expressRequireCard,
    expressRequireDeposit: settings.expressRequireDeposit,
    paymentMode: isPartial ? "partial" : "full",
    partialType:
      settings.expressDepositType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
    expressDepositAmount: settings.expressDepositAmount ?? "",
  };
}

export function expressDepositFieldsToPreferences(
  values: ExpressDepositFieldsValue,
): {
  expressRequireCard: boolean;
  expressRequireDeposit: boolean;
  expressDepositType: "FULL" | "FIXED" | "PERCENTAGE";
  expressDepositAmount: string | null;
} {
  if (!values.expressRequireDeposit) {
    return {
      expressRequireCard: values.expressRequireCard,
      expressRequireDeposit: false,
      expressDepositType: "FULL",
      expressDepositAmount: null,
    };
  }

  if (values.paymentMode === "full") {
    return {
      expressRequireCard: values.expressRequireCard,
      expressRequireDeposit: true,
      expressDepositType: "FULL",
      expressDepositAmount: null,
    };
  }

  return {
    expressRequireCard: values.expressRequireCard,
    expressRequireDeposit: true,
    expressDepositType: values.partialType,
    expressDepositAmount: values.expressDepositAmount.trim() || null,
  };
}

interface ExpressDepositFieldsProps {
  value: ExpressDepositFieldsValue;
  onChange: (next: ExpressDepositFieldsValue) => void;
  disabled?: boolean;
  className?: string;
}

export function ExpressDepositFields({
  value,
  onChange,
  disabled = false,
  className,
}: ExpressDepositFieldsProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="express-require-card">Require a credit card</Label>
        <Switch
          id="express-require-card"
          checked={value.expressRequireCard}
          disabled={disabled || value.expressRequireDeposit}
          onCheckedChange={(checked) =>
            onChange({ ...value, expressRequireCard: checked })
          }
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="express-require-deposit">
          Require a payment or deposit
        </Label>
        <Switch
          id="express-require-deposit"
          checked={value.expressRequireDeposit}
          disabled={disabled}
          onCheckedChange={(checked) =>
            onChange({
              ...value,
              expressRequireDeposit: checked,
              expressRequireCard: checked ? false : value.expressRequireCard,
            })
          }
        />
      </div>

      {value.expressRequireDeposit ? (
        <div className="space-y-4 rounded-lg border border-border/70 p-4">
          <RadioGroup
            value={value.paymentMode}
            onValueChange={(next) =>
              onChange({
                ...value,
                paymentMode: next as "full" | "partial",
              })
            }
            className="space-y-3"
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="full" id="express-payment-full" />
              <Label htmlFor="express-payment-full" className="font-normal">
                Full payment
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="partial" id="express-payment-partial" />
              <Label htmlFor="express-payment-partial" className="font-normal">
                Partial deposit
              </Label>
            </div>
          </RadioGroup>

          {value.paymentMode === "partial" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="express-deposit-amount">
                  {value.partialType === "PERCENTAGE"
                    ? "Deposit percentage"
                    : "Deposit amount"}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="express-deposit-amount"
                    type="number"
                    min={value.partialType === "PERCENTAGE" ? 1 : 0.01}
                    max={value.partialType === "PERCENTAGE" ? 100 : undefined}
                    step={value.partialType === "PERCENTAGE" ? 1 : 0.01}
                    value={value.expressDepositAmount}
                    disabled={disabled}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        expressDepositAmount: e.target.value,
                      })
                    }
                    className="flex-1"
                  />
                  <AmountUnitToggle
                    value={value.partialType}
                    currencyValue="FIXED"
                    percentValue="PERCENTAGE"
                    disabled={disabled}
                    onValueChange={(partialType) =>
                      onChange({ ...value, partialType })
                    }
                    aria-label="Deposit unit"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
