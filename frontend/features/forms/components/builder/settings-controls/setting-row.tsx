"use client";

import { Label } from "@/components/ui/label";
import { DRAWER_FIELD_LABEL_CLASS } from "@/lib/design/drawer-tokens";
import { cn } from "@/lib/utils";

interface SettingRowProps {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingRow({ label, htmlFor, children, className }: SettingRowProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className={DRAWER_FIELD_LABEL_CLASS}>
        {label}
      </Label>
      {children}
    </div>
  );
}
