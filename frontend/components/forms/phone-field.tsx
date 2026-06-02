"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { PhoneInput } from "@/components/forms/phone-input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export interface PhoneFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  showClear?: boolean;
}

export function PhoneField<T extends FieldValues>({
  control,
  name,
  label = "Phone",
  placeholder,
  disabled,
  showClear,
}: PhoneFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <PhoneInput
              value={field.value ?? ""}
              onChange={(v) => field.onChange(v ?? "")}
              placeholder={placeholder}
              disabled={disabled}
              showClear={showClear}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
