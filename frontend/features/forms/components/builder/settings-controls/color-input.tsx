"use client";

import { Input } from "@/components/ui/input";
import { FORM_ACCENT_COLOR_HEX } from "@/lib/design/forms-builder-tokens";
import { cn } from "@/lib/utils";

export function toColorInputValue(
  hex: string | undefined,
  fallback = FORM_ACCENT_COLOR_HEX,
): string {
  if (!hex) return fallback;
  const normalized = hex.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) return normalized;
  if (/^#[0-9A-Fa-f]{3}$/.test(normalized)) {
    const [, r, g, b] = normalized;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}

interface ColorInputProps {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ColorInput({ value, onChange, className }: ColorInputProps) {
  const display = toColorInputValue(value, "");

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input
        type="color"
        value={toColorInputValue(value)}
        onChange={(event) => onChange(event.target.value)}
        className="size-9 shrink-0 cursor-pointer rounded-[var(--radius-control)] border border-[var(--drawer-field-border)] bg-transparent p-0.5"
        aria-label="Pick color"
      />
      <Input
        value={display}
        onChange={(event) => onChange(event.target.value)}
        placeholder={FORM_ACCENT_COLOR_HEX}
        className="text-sm font-mono"
      />
    </div>
  );
}
