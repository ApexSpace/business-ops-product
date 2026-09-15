"use client";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { FORMS_BUILDER_SETTING_HELPER_CLASS } from "@/lib/design/forms-builder-tokens";

interface SettingToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  labelClassName?: string;
  className?: string;
}

export function SettingToggle({
  checked,
  onChange,
  label,
  description,
  labelClassName,
  className,
}: SettingToggleProps) {
  return (
    <div className={cn("flex flex-col gap-[var(--spacing-2)]", className)}>
      <label className="flex items-center justify-between gap-[var(--spacing-3)] text-sm">
        {label ? (
          <span className={cn("font-medium text-foreground", labelClassName)}>
            {label}
          </span>
        ) : null}
        <Switch checked={checked} onCheckedChange={onChange} />
      </label>
      {description ? (
        <p className={FORMS_BUILDER_SETTING_HELPER_CLASS}>{description}</p>
      ) : null}
    </div>
  );
}
