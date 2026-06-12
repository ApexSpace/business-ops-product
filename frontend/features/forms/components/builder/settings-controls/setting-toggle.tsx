"use client";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface SettingToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export function SettingToggle({
  checked,
  onChange,
  label,
  className,
}: SettingToggleProps) {
  return (
    <label className={cn("flex items-center justify-between gap-2 text-sm", className)}>
      {label ? <span>{label}</span> : null}
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
