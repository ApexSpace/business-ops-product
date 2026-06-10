"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  clampFeatureListGapEm,
  FEATURE_LIST_GAP_EM_DEFAULT,
  FEATURE_LIST_GAP_EM_MAX,
  FEATURE_LIST_GAP_EM_MIN,
  FEATURE_LIST_GAP_EM_STEP,
  formatFeatureListGapEm,
} from "@/features/platform/utils/plan-design-settings.util";

type FeatureListGapControlProps = {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  disabled?: boolean;
};

function FeatureListGapControl({
  value,
  onChange,
  label = "Item spacing",
  disabled,
}: FeatureListGapControlProps) {
  const displayValue = clampFeatureListGapEm(value);

  const handleSliderChange = (next: number) => {
    onChange(clampFeatureListGapEm(next));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <span className="text-xs text-muted-foreground">
          {formatFeatureListGapEm(displayValue)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={FEATURE_LIST_GAP_EM_MIN}
          max={FEATURE_LIST_GAP_EM_MAX}
          step={FEATURE_LIST_GAP_EM_STEP}
          value={displayValue}
          disabled={disabled}
          className="h-2 min-w-0 flex-1 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-60"
          onChange={(event) => handleSliderChange(Number(event.target.value))}
        />
        <Input
          type="number"
          min={FEATURE_LIST_GAP_EM_MIN}
          max={FEATURE_LIST_GAP_EM_MAX}
          step={FEATURE_LIST_GAP_EM_STEP}
          value={displayValue}
          disabled={disabled}
          className="w-20 shrink-0"
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (Number.isFinite(parsed)) {
              handleSliderChange(parsed);
            }
          }}
          onBlur={() => handleSliderChange(displayValue)}
        />
      </div>
    </div>
  );
}

type FeatureListGapFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  disabled?: boolean;
};

export function FeatureListGapField<T extends FieldValues>({
  control,
  name,
  label,
  disabled,
}: FeatureListGapFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <FeatureListGapControl
              label={label}
              disabled={disabled}
              value={
                typeof field.value === "number"
                  ? field.value
                  : FEATURE_LIST_GAP_EM_DEFAULT
              }
              onChange={field.onChange}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
