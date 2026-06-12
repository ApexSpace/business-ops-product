"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface SettingInputProps {
  id?: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: "text" | "number" | "email" | "url";
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
}

export function SettingInput({
  id,
  value,
  onChange,
  type = "text",
  placeholder,
  multiline,
  rows = 3,
  className,
}: SettingInputProps) {
  if (multiline) {
    return (
      <Textarea
        id={id}
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
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
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={cn("text-sm", className)}
    />
  );
}
