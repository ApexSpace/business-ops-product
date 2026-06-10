"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { sanitizeOptionalHexColor } from "@/features/platform/utils/plan-design-settings.util";

type PlanDesignColorFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  disabled?: boolean;
  placeholder?: string;
};

export function PlanDesignColorField<T extends FieldValues>({
  control,
  name,
  label,
  disabled = false,
  placeholder = "#2563eb",
}: PlanDesignColorFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const safeValue = sanitizeOptionalHexColor(field.value) ?? "";
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <div className="flex items-center gap-2">
              <FormControl>
                <Input
                  type="color"
                  className="h-10 w-14 shrink-0 p-1"
                  value={safeValue || "#2563eb"}
                  disabled={disabled}
                  onChange={(event) => field.onChange(event.target.value)}
                />
              </FormControl>
              <FormControl>
                <Input
                  value={field.value ?? ""}
                  disabled={disabled}
                  placeholder={placeholder}
                  onChange={(event) => field.onChange(event.target.value)}
                  onBlur={() => {
                    const sanitized = sanitizeOptionalHexColor(field.value);
                    field.onChange(sanitized ?? "");
                  }}
                />
              </FormControl>
            </div>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
