"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface SettingInputProps {
  id?: string;
  value: string | number;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: "text" | "number" | "email" | "url";
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
  min?: number;
  step?: string | number;
}

export function SettingInput({
  id,
  value,
  onChange,
  onBlur,
  type = "text",
  placeholder,
  multiline,
  rows = 3,
  className,
  min,
  step,
}: SettingInputProps) {
  if (multiline) {
    return (
      <Textarea
        id={id}
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        className={cn("text-sm", className)}
      />
    );
  }

  return (
    <Input
      id={id}
      type={type}
      value={value}
      min={min}
      step={step}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className={cn("text-sm", className)}
    />
  );
}
