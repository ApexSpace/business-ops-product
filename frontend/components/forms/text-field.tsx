"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface TextFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  type?: React.ComponentProps<typeof Input>["type"];
  multiline?: boolean;
  rows?: number;
  description?: string;
  disabled?: boolean;
  maxLength?: number;
  inputClassName?: string;
  className?: string;
  /** Parse the input as an integer (financial numbering, counts). */
  valueAsNumber?: boolean;
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  type = "text",
  multiline = false,
  rows,
  description,
  disabled,
  maxLength,
  inputClassName,
  className,
  valueAsNumber = false,
}: TextFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            {multiline ? (
              <Textarea
                rows={rows}
                placeholder={placeholder}
                disabled={disabled}
                maxLength={maxLength}
                className={inputClassName}
                {...field}
              />
            ) : (
              <Input
                type={type}
                placeholder={placeholder}
                disabled={disabled}
                maxLength={maxLength}
                className={inputClassName}
                {...field}
                value={field.value ?? ""}
                onChange={(e) => {
                  if (valueAsNumber) {
                    const parsed = parseInt(e.target.value, 10);
                    field.onChange(Number.isNaN(parsed) ? 0 : parsed);
                    return;
                  }
                  field.onChange(e);
                }}
              />
            )}
          </FormControl>
          {description ? (
            <FormDescription>{description}</FormDescription>
          ) : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
