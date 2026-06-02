"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { SearchableSelect } from "@/components/forms/searchable-select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  items: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  items,
  placeholder,
  disabled,
  searchable = true,
  searchPlaceholder,
}: SelectFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="w-full">
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <SearchableSelect
              items={items}
              value={field.value || null}
              onValueChange={(v) => field.onChange(v ?? "")}
              placeholder={placeholder}
              disabled={disabled}
              searchable={searchable}
              searchPlaceholder={searchPlaceholder}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
