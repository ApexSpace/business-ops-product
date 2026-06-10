"use client";

import type { Control } from "react-hook-form";
import { CheckboxField } from "@/components/forms/checkbox-field";
import { TextField } from "@/components/forms/text-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreatePlanTierValues } from "@/features/platform/schemas/plan-group-form";
import { sanitizeOptionalHexColor } from "@/features/platform/utils/plan-design-settings.util";

type PlanTierFormFieldsProps = {
  control: Control<CreatePlanTierValues>;
  disabled?: boolean;
  cardBackgroundColor?: string;
  onCardBackgroundColorChange?: (value: string) => void;
};

export function PlanTierFormFields({
  control,
  disabled,
  cardBackgroundColor,
  onCardBackgroundColorChange,
}: PlanTierFormFieldsProps) {
  const safeCardBackgroundColor =
    sanitizeOptionalHexColor(cardBackgroundColor) ?? "";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField control={control} name="name" label="Name" disabled={disabled} />
      <CheckboxField
        control={control}
        name="highlighted"
        label="Highlighted tier"
        disabled={disabled}
      />
      <div className="sm:col-span-2">
        <TextField
          control={control}
          name="description"
          label="Description"
          disabled={disabled}
          multiline
        />
      </div>
      {onCardBackgroundColorChange ? (
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Card background color</Label>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              className="h-10 w-14 shrink-0 p-1"
              value={safeCardBackgroundColor || "#2563eb"}
              disabled={disabled}
              onChange={(event) =>
                onCardBackgroundColorChange(event.target.value)
              }
            />
            <Input
              value={cardBackgroundColor ?? ""}
              disabled={disabled}
              placeholder="Use global default"
              onChange={(event) =>
                onCardBackgroundColorChange(event.target.value)
              }
              onBlur={() =>
                onCardBackgroundColorChange(
                  sanitizeOptionalHexColor(cardBackgroundColor) ?? "",
                )
              }
            />
          </div>
        </div>
      ) : null}
      <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
        <TextField
          control={control}
          name="priceMonthly"
          label="Monthly price"
          disabled={disabled}
          placeholder="29.00"
        />
        <TextField
          control={control}
          name="priceYearly"
          label="Yearly price"
          disabled={disabled}
          placeholder="290.00"
        />
        <TextField
          control={control}
          name="setupFee"
          label="Setup fee"
          disabled={disabled}
        />
      </div>
      <TextField
        control={control}
        name="trialDays"
        label="Trial days"
        disabled={disabled}
        type="number"
      />
      <TextField
        control={control}
        name="badge"
        label="Badge"
        placeholder="Popular"
        disabled={disabled}
      />
      <TextField
        control={control}
        name="ctaLabel"
        label="CTA label"
        disabled={disabled}
      />
      <TextField
        control={control}
        name="ctaUrl"
        label="CTA URL"
        disabled={disabled}
      />
    </div>
  );
}
