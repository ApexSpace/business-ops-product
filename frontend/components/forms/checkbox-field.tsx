"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export interface CheckboxFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function CheckboxField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
}: CheckboxFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center gap-3 space-y-0">
          <FormControl>
            <Checkbox
              checked={Boolean(field.value)}
              onCheckedChange={(v) => field.onChange(v === true)}
              disabled={disabled}
            />
          </FormControl>
          <div className="space-y-0.5 leading-none">
            <FormLabel className="font-normal">{label}</FormLabel>
            {description ? (
              <FormDescription>{description}</FormDescription>
            ) : null}
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}
